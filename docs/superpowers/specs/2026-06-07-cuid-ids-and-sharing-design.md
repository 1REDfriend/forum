# Design: CUID IDs + Thread/Post Sharing

Date: 2026-06-07
Status: Approved (pending spec review)

## Problem

1. All entity IDs are sequential `serial` integers. They are guessable and
   enumerable, making brute-force scraping / IDOR probing trivial.
2. There is no way to share a thread or an individual post by link, and shared
   links produce no rich preview on social platforms.

## Goals

- Replace every primary key with a short, non-sequential, collision-resistant
  CUID2 (length 16). Convert every foreign key accordingly. No integer IDs
  remain anywhere in the API or URLs.
- Preserve all existing production data through a hand-written SQL migration
  that remaps integer FKs to the new CUIDs.
- Add a Share affordance to threads and individual posts: copy link + native
  Web Share, plus Open Graph / Twitter Card previews for crawlers.

## Non-Goals

- No social "share to X/Facebook/LINE" buttons (Web Share covers mobile).
- No server-side rendering of the SPA beyond the dedicated crawler endpoint.
- No change to auth/session semantics beyond ID type.

## Decisions (locked)

| Decision | Choice |
|---|---|
| ID strategy | Full PK replacement (no parallel publicId column) |
| Scope | Every table |
| CUID library | `@paralleldrive/cuid2`, configured length **16** |
| Migration | Hand-written SQL, remap FKs, **keep existing data** |
| Share level | Copy link + Web Share API + OG/Twitter meta |
| OG delivery | nginx crawler UA sniff → backend `/share/...` endpoint |

## Architecture

### 1. ID generation

Single helper `backend/src/db/ids.ts`:

```ts
import { init } from '@paralleldrive/cuid2';
export const newId = init({ length: 16 });
```

Used by every table's `$defaultFn` and anywhere an ID is created in code.

### 2. Schema changes (`backend/src/db/schema.ts`)

For every table:

- `id: serial("id").primaryKey()` → `id: text("id").primaryKey().$defaultFn(newId)`
- Every FK `integer("x_id").references(...)` → `text("x_id").references(...)`
  keeping the same `onDelete` behaviour.
- `reports.targetId` (`integer`, polymorphic, no FK) → `text("target_id")`.

Indexes and unique constraints stay; only the column type changes.

### 3. Data migration (the risky part)

drizzle-kit `generate` cannot move data, so this is a hand-authored SQL
migration file added after the current `0005`. It must run inside a single
transaction and be preceded by a `pg_dump` backup.

Per table, in FK-dependency order
(`users → forums → threads → posts → likes, reports, user_badges,
password_reset_tokens, refresh_tokens`):

1. `ALTER TABLE t ADD COLUMN id_new text;`
2. Backfill: `UPDATE t SET id_new = <generate cuid per row>;`
   (generate CUIDs in app code or a PL/pgSQL helper; store the old→new map in a
   temp table `t_idmap(old_id int, new_id text)` so children can join).
3. For each child FK column: `ADD COLUMN fk_new text;` then
   `UPDATE child SET fk_new = m.new_id FROM parent_idmap m
    WHERE child.fk_old = m.old_id;`
4. `reports.target_id`: remap conditioned on `target_type`
   (join `threads_idmap` when `'thread'`, `posts_idmap` when `'post'`,
   `users_idmap` when `'user'`).
5. Drop old FK constraints → drop old columns → rename `*_new` → old names →
   re-add PK, FK, indexes, unique constraints.
6. Drop the temp idmap tables.

Validation gate before commit: row counts unchanged per table, and
`COUNT(*)` of orphaned FKs (child FK with no matching parent) is zero for every
relationship. Dry-run on a copy of the prod dump first; short downtime for the
real run.

### 4. Backend code changes

- `IdParam` in `backend/src/types/index.ts`: `t.Numeric()` → `t.String()`.
  `/threads/forum/:forumId` param → `t.String()`.
- Routes using numeric params: `admin`, `forum`, `like`, `post`, `thread`,
  `user` route files — drop numeric coercion, accept string.
- Repositories & services: change every `id: number` / FK `: number` signature
  to `string`; remove `parseInt`/`Number()` on IDs. Affected:
  all 10 repositories + ~10 services listed in the implementation plan.
- JWT: `userId` claim becomes a string. Check `backend/src/config/jwt.ts` and
  `backend/src/http/auth.ts` for any numeric assumptions.
- `seed.ts`: generate CUIDs instead of relying on serial.

### 5. Frontend code changes

- Router patterns (`/thread/:id`, `/user/:id`, `/forum/:forum`) already accept
  strings — no pattern change.
- Remove `parseInt` / `Number()` on IDs in: `ForumView.vue`, `ProfileView.vue`,
  `ThreadCreateView.vue`, `ThreadDetailView.vue`, plus any API store layer that
  types IDs as `number`.

### 6. Share feature

**UI**
- Share button on thread header and on each post.
- On click: build canonical URL, call `navigator.share()` when available, else
  copy to clipboard with a toast.
- Thread URL: `${FRONTEND_URL}/thread/:cuid`.
- Post URL: `${FRONTEND_URL}/thread/:cuid#post-:cuid`.
- `ThreadDetailView.vue`: on mount, if URL hash matches `#post-<id>`, scroll to
  that post and briefly highlight it.

**OG / Twitter previews**
- New backend route `backend/src/routes/share.routes.ts`:
  `GET /share/thread/:id` (and `/share/post/:id`) returns a minimal HTML
  document containing `og:title`, `og:description`, `og:url`, `og:image`,
  `og:type`, and `twitter:card` meta, derived from the thread/post + author.
  Body includes a `<meta http-equiv="refresh">` / JS redirect to the real SPA
  URL so any human who hits it lands in the app.
- `frontend/nginx.conf`: add crawler detection. When `$http_user_agent` matches
  known bots (facebookexternalhit, Twitterbot, Slackbot, LINE, Discordbot,
  WhatsApp, TelegramBot, etc.), `proxy_pass` `/thread/:id` to the backend
  `/share/thread/:id`; otherwise serve the SPA via existing `try_files`.
  Requires the backend host reachable from the frontend container (same compose
  network — add an upstream).

### 7. Testing

- Unit: `newId()` returns 16-char, non-sequential, URL-safe IDs.
- Migration: scripted dry-run on a seeded DB — assert per-table row counts
  unchanged and zero orphaned FKs after migration.
- Backend route tests: ID params accept CUID strings; reject obviously invalid
  ids; `/share/thread/:id` emits correct OG tags.
- Frontend: share URL construction (thread vs post), hash scroll-to-post.
- Manual: migrate a copy of the prod dump; smoke-test the app end-to-end; verify
  an OG preview via a card validator against the bot endpoint.

## Rollout

1. Backup prod (`pg_dump`).
2. Deploy in a maintenance window: stop backend, run migration, deploy new
   backend + frontend images, smoke test.
3. Rollback = restore dump + previous images (IDs are not reversible once code
   expects strings, so rollback means full restore).

## Risks

- **Migration correctness** is the dominant risk — orphaned FKs would silently
  break relations. Mitigated by the idmap-join approach + validation gate +
  dry-run.
- **OG endpoint** adds a backend dependency to the frontend nginx; if backend is
  down, crawler requests to thread URLs fail (humans unaffected — they hit
  `try_files`). Acceptable.
- Old shared/bookmarked integer URLs (`/thread/42`) become dead 404s. Acceptable
  for this app; no redirect mapping kept.
