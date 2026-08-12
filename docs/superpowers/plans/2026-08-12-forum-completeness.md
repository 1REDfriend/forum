# Forum Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn IT.FORUM from a solid CRUD forum into a living community (activity home, notifications, unread, quote/mentions, discovery, trust) per the 2026-08-12 completeness design.

**Architecture:** Keep existing layers — Hono routes → service → repository → Drizzle; Vue 3 + Pinia + TanStack Query; pure helpers in `backend/src/domain/*` with `bun test`. Ship as a **PR stack A→F**; each phase is independently demoable. Notifications never break primary writes (post/like succeed even if notify insert fails).

**Tech Stack:** Backend Bun + Hono + Drizzle + Zod + PostgreSQL; Frontend Vue 3 + TanStack Query + Pinia; tests `bun test` / `npm run type-check`.

**Spec:** `.claude/specs/2026-08-12-forum-completeness-design.md`  
**Save shipped plan copy (on execute):** `docs/superpowers/plans/2026-08-12-forum-completeness.md`

**Working directory:** backend commands in `backend/`, frontend in `frontend/`, git from repo root.

---

## 0. Decisions (defaults for this plan)

Open questions from the design are resolved here so implementers do not stall. Change only if product owner overrides.

| Topic | Decision | Rationale |
|---|---|---|
| Announcements posting | **manager+ only** via `forums.postRoleMin = 'manager'` (Phase F); until then sticky seed + social convention | Aligns with existing manager role |
| Like notifications | **Skip in B v1** | Noise; re-enable collapsed likes in B1.1 if asked |
| Mention syntax | `[@name](user:USER_ID)` | Stable id; server re-parses markdown |
| Home routes | `/` stays marketing landing; **`/forums` becomes living home** (stats + activity + boards) | Minimal router churn; guests still see activity on `/forums` |
| Rules copy | **Thai primary** short rules sticky + later `/rules` page | Matches UI language of landing |
| Tags (E.2) | **Skip tags** in first pass | Ship sort/filter + leaderboard only |
| Phase G | **Out of this plan** | Separate sub-specs later |

**Launch-complete definition (from spec §8):** A + B reply notifs + C unread + D.1 quote + seed rules + F.4 post rate limit.

---

## 1. Baseline (already in repo — do not rebuild)

| Exists | Path / note |
|---|---|
| Forum list + `threadCount` / `postCount` / `lastPostAt` / `lastPostAuthor` | `forum.repository.ts` `findAllWithStats` — **missing** `lastThreadId`, `lastThreadTitle` |
| Client-only unread (localStorage) | `Forum.vue` — **replace** with server `thread_reads` in Phase C |
| Seed has Announcements + pinned welcome | `seed.ts` — reshape to Rules / Start here + ensure ≥3 clear boards |
| Admin counts | `admin.repository` dashboard totals — reuse query style for public stats |
| Rate limiters (auth + global IP) | `http/rateLimit.ts` — extend with **per-user** post/thread limits in F |
| Media rewrite | `domain/media-url.ts` — all new DTO avatars must use `toPublicMediaUrl` |
| Patterns | Manager plan style: domain TDD → service → route → frontend |

---

## 2. File map (by phase)

### Phase A
| Action | Path |
|---|---|
| Create | `backend/src/domain/snippet.ts`, `snippet.test.ts` |
| Create | `backend/src/repositories/activity.repository.ts` |
| Create | `backend/src/services/activity.service.ts` |
| Create | `backend/src/routes/activity.routes.ts` (mount `/activity`, `/stats` or single router) |
| Modify | `backend/src/index.ts` — register routes |
| Modify | `backend/src/repositories/forum.repository.ts` — last thread fields |
| Modify | `backend/src/db/seed.ts` — bootstrap boards + sticky rules |
| Create | `frontend/src/api/activity.ts` |
| Modify | `frontend/src/api/types.ts`, `api/index.ts` |
| Create | `frontend/src/composables/useActivity.ts`, `usePublicStats.ts` |
| Modify | `frontend/src/components/Forum.vue` (or split `ActivityFeed.vue`) |
| Modify | `frontend/src/views/LandingHomeView.vue` — optional real stats strip |

### Phase B
| Action | Path |
|---|---|
| Modify | `backend/src/db/schema.ts` + migration `0009_notifications.sql` |
| Create | `notification.repository.ts`, `notification.service.ts`, `notification.routes.ts` |
| Modify | `post.service.ts`, `badge.service.ts` (emit; likes deferred) |
| Frontend | `api/notifications.ts`, composable, Navbar bell, `NotificationsView.vue`, router |

### Phase C
| Action | Path |
|---|---|
| Schema | `thread_reads` migration `0010_…` |
| Modify | `thread.repository` / `thread.service` / routes — `POST /threads/:id/read`, `isUnread` |
| Frontend | remove localStorage unread from `Forum.vue`; thread list bold/dot; mark-read on detail |

### Phase D
| Action | Path |
|---|---|
| Domain | `domain/mentions.ts` (+ tests), optional quote helper |
| Schema | optional `posts.reply_to_post_id` |
| Modify | create post DTO, post service, user suggest route |
| Frontend | Quote button on `ThreadDetailView`, mention typeahead, renderer links |

### Phase E
| Action | Path |
|---|---|
| Modify | `thread.repository.findByForumId` sort/filter params |
| Create | leaderboard repo/service/route + `LeaderboardView.vue` |

### Phase F
| Action | Path |
|---|---|
| Frontend | `/rules`, `/help` static/md pages + footer/register links |
| Schema | `forums.post_role_min`, optional `forum_moderators` |
| Domain | extend `forum-policy.ts` |
| Rate limit | per-user post/thread limiters |

---

## 3. PR stack (merge order)

1. **PR-A1** — stats + activity API + forum last-thread enrichment  
2. **PR-A2** — `/forums` living home UI  
3. **PR-A3** — seed/bootstrap content  
4. **PR-B1** — notifications schema + service + emit on reply/badge  
5. **PR-B2** — bell + notifications UI  
6. **PR-C1** — thread_reads + isUnread + mark read  
7. **PR-D1** — quote + optional `replyToPostId` + `post_reply` notif  
8. **PR-D2** — mentions parse + suggest + notif  
9. **PR-E1** — sort/filter  
10. **PR-E2** — leaderboard  
11. **PR-F1** — rules/help pages + post rate limit + announcements readonly  

Do **not** implement G in this plan.

---

# Phase A — Living home + bootstrap

## Task A1: Snippet helper (domain, TDD)

**Files:**
- Create: `backend/src/domain/snippet.ts`
- Test: `backend/src/domain/snippet.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { test, expect } from 'bun:test';
import { makeSnippet } from './snippet.js';

test('strips markdown images and collapses whitespace', () => {
  const s = makeSnippet('Hello ![x](http://a/b.png) **world**\n\nnext', 160);
  expect(s).toBe('Hello world next');
});

test('truncates long text with ellipsis', () => {
  const s = makeSnippet('a'.repeat(200), 50);
  expect(s.length).toBeLessThanOrEqual(51); // 50 + …
  expect(s.endsWith('…')).toBe(true);
});

test('empty input returns empty string', () => {
  expect(makeSnippet('', 160)).toBe('');
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && bun test src/domain/snippet.test.ts
```

- [ ] **Step 3: Implement**

```ts
/** First ~maxLen chars of post/thread body for activity feeds. */
export function makeSnippet(markdown: string, maxLen = 160): string {
  let t = markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[`*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trimEnd() + '…';
}
```

- [ ] **Step 4: Tests pass + commit**

```bash
cd backend && bun test src/domain/snippet.test.ts
# git: feat(domain): add markdown snippet helper for activity feed
```

---

## Task A2: Activity repository + service + routes

**Files:**
- Create: `backend/src/repositories/activity.repository.ts`
- Create: `backend/src/services/activity.service.ts`
- Create: `backend/src/routes/activity.routes.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Repository — recent events**

Implement `findRecent(limit: number)` that returns a unified feed ordered by event time DESC, cap 1–50:

1. **Thread opens:** rows from `threads` joined `users`, `forums` → `kind: 'thread'`, `id = thread.id`, `threadId = thread.id`, snippet from thread content, `createdAt = thread.createdAt`.
2. **Posts:** rows from `posts` joined author, thread, forum → `kind: 'post'`, snippet from post content.

**Preferred SQL shape (union):**

```sql
(
  SELECT 'thread' AS kind, t.id, t.id AS thread_id, t.title AS thread_title,
         f.id AS forum_id, f.name AS forum_name,
         u.id AS author_id, u.name AS author_name, u.avatar AS author_avatar,
         t.content AS body, t.created_at AS created_at
  FROM threads t
  JOIN users u ON u.id = t.author_id
  JOIN forums f ON f.id = t.forum_id
)
UNION ALL
(
  SELECT 'post', p.id, t.id, t.title, f.id, f.name,
         u.id, u.name, u.avatar, p.content, p.created_at
  FROM posts p
  JOIN users u ON u.id = p.author_id
  JOIN threads t ON t.id = p.thread_id
  JOIN forums f ON f.id = t.forum_id
)
ORDER BY created_at DESC
LIMIT $limit
```

Use Drizzle `sql` raw or two queries + merge/sort in TS if cleaner; keep **one round-trip preferred**.

- [ ] **Step 2: `activity.service.ts`**

- Clamp `limit` to 1–50, default 20.
- Map rows through `makeSnippet(body)`, `toPublicMediaUrl(avatar)`.
- Response shape exactly:

```ts
{
  items: Array<{
    kind: 'post' | 'thread';
    id: string;
    threadId: string;
    threadTitle: string;
    forumId: string;
    forumName: string;
    author: { id: string; name: string; avatar: string | null };
    snippet: string;
    createdAt: string; // ISO
  }>;
}
```

- [ ] **Step 3: Public stats**

In same service or `stats.service.ts`:

```ts
// COUNT users, threads, posts, forums — no auth
{ members, threads, posts, forums }
```

Reuse style from `admin.repository` counts.

- [ ] **Step 4: Routes (public, no auth)**

```ts
// activity.routes.ts
import { Hono } from 'hono';
import { activityService } from '../services/activity.service.js';

export const activityRoutes = new Hono()
  .get('/recent', async (c) => {
    const limit = Number(c.req.query('limit') ?? 20);
    return c.json(await activityService.getRecent(limit));
  });

export const statsRoutes = new Hono()
  .get('/public', async (c) => c.json(await activityService.getPublicStats()));
```

Mount in `index.ts`:

```ts
app.route('/activity', activityRoutes);
app.route('/stats', statsRoutes);
```

- [ ] **Step 5: Manual smoke**

```bash
cd backend && bun run dev
# curl http://localhost:3636/stats/public
# curl http://localhost:3636/activity/recent?limit=5
```

Expected: JSON counts; items array (may be empty on empty DB).

- [ ] **Step 6: Commit** `feat(api): public activity feed and site stats`

---

## Task A3: Enrich forum summary fields

**Files:**
- Modify: `backend/src/repositories/forum.repository.ts` `findAllWithStats`
- Modify: `frontend/src/api/types.ts` `ForumWithStats`

- [ ] **Step 1: Extend subquery** so last activity is the latest of (last post, or thread create if no posts). Spec fields:

- `lastActivityAt` (prefer this name; keep `lastPostAt` as alias for backward compat **or** map both)
- `lastThreadId`, `lastThreadTitle`, `lastAuthorName`

Practical approach: keep existing `lastPostAt` / `lastPostAuthor` and **add**:

```sql
lastThreadId: (SELECT threads.id FROM threads WHERE forum_id = forums.id
  ORDER BY COALESCE(
    (SELECT MAX(posts.created_at) FROM posts WHERE posts.thread_id = threads.id),
    threads.created_at
  ) DESC LIMIT 1)

lastThreadTitle: same ORDER BY … SELECT title
```

If subqueries get heavy, accept “last post’s thread” only (simpler):

```sql
(SELECT threads.id FROM posts JOIN threads ON … WHERE threads.forum_id = forums.id
 ORDER BY posts.created_at DESC LIMIT 1)
```

Plus fallback when forum has threads but zero posts: latest thread by `created_at`.

- [ ] **Step 2: Update frontend type**

```ts
export interface ForumWithStats extends Forum {
  threadCount: number;
  postCount: number;
  lastPostAt: string | null;
  lastPostAuthor: string | null;
  lastThreadId?: string | null;
  lastThreadTitle?: string | null;
}
```

- [ ] **Step 3: Smoke `GET /forums`** — each forum has counts + last activity fields.

- [ ] **Step 4: Commit** `feat(forums): last thread title/id on forum summary`

---

## Task A4: Frontend living home (`/forums`)

**Files:**
- Create: `frontend/src/api/activity.ts`
- Create: `frontend/src/composables/useActivity.ts`, `usePublicStats.ts`
- Modify: `frontend/src/api/index.ts`, `types.ts`
- Modify: `frontend/src/components/Forum.vue` (primary board index UI)

- [ ] **Step 1: API client**

```ts
// api/activity.ts
import { apiClient } from './client';

export function fetchRecentActivity(limit = 20) {
  return apiClient.get(`/activity/recent?limit=${limit}`).then(r => r.data);
}
export function fetchPublicStats() {
  return apiClient.get('/stats/public').then(r => r.data);
}
```

(Adjust to match existing `client.ts` style — if client returns JSON body directly, follow that.)

- [ ] **Step 2: Composables** — TanStack Query keys `['activity','recent', limit]`, `['stats','public']`, staleTime ~30s.

- [ ] **Step 3: UI layout in `Forum.vue`** (mobile stack: stats → activity → boards)

1. **Stats strip:** members / threads / posts / forums from `usePublicStats` (skeleton while pending).
2. **Recent activity:** list of cards/rows linking to `/thread/:threadId` (and hash `#post-:id` when kind=post).
3. **Boards:** existing list; show `lastThreadTitle` + author + relative time; empty forum CTA “Be the first to start a thread” → create-thread if authed else login.
4. Keep create-forum button for manager+.

Design tokens: `frontend/DESIGN.md` / existing CSS variables (`--color-heading`, etc.).

- [ ] **Step 4: Optional** LandingHomeView stats: replace fake `∞ / 24/7 / 100%` with real `usePublicStats` numbers where it fits without redesigning whole marketing page.

- [ ] **Step 5: Typecheck**

```bash
cd frontend && npm run type-check
```

- [ ] **Step 6: Commit** `feat(ui): living forums home with stats and activity`

---

## Task A5: Seed bootstrap content

**Files:**
- Modify: `backend/src/db/seed.ts`

- [ ] **Step 1: Ensure forums (idempotent intent for non-wipe prod path later; current seed wipes — OK for mock)**

Target boards:

| Name | Purpose |
|---|---|
| Announcements | Official sticky rules |
| General | Default chat |
| Help & Feedback | Bugs / product |
| Showcase | Projects |

Can rename/replace current Vue/Hardware boards or keep extras — **minimum:** Announcements + General + Help & Feedback + Showcase.

- [ ] **Step 2: Sticky threads in Announcements (admin author)**

1. **กฎของชุมชน (Rules)** — Thai short rules (respect, no spam, markdown tips).  
2. **เริ่มที่นี่ (Start here)** — how to post, attachments, tiers one-pager.

Both `isPinned: true`.

- [ ] **Step 3: Run seed**

```bash
cd backend && bun run seed   # or seed:mock per env
```

- [ ] **Step 4: Acceptance A**

- Guest: `/forums` shows stats + activity (or empty copy) without login.  
- Create post → refresh → appears at top of activity.  
- Boards show last activity.  
- Fresh seed → Rules sticky + ≥3 boards.

- [ ] **Step 5: Commit** `chore(seed): bootstrap boards and rules stickies`

---

# Phase B — Notifications

## Task B1: Schema + repository

**Files:**
- Modify: `backend/src/db/schema.ts`
- Generate: `backend/src/db/migrations/0009_*.sql` via `bun run generate` then migrate

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().$defaultFn(newId),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // thread_reply | post_reply | badge_awarded | mention | …
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  threadId: text('thread_id'),
  payload: text('payload'), // store JSON string OR use jsonb if drizzle jsonb available
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ([
  index('notifications_user_created_idx').on(t.userId, t.createdAt),
  // partial index for unread: add in raw SQL migration if needed
]));
```

If project already uses only `text/timestamp/boolean/integer`, store `payload` as `text` JSON to avoid new column types friction; or add `jsonb` consistently.

- [ ] **Step 1: Migration + repository methods**

- `create(row)`  
- `listForUser(userId, page, limit)` join actor  
- `countUnread(userId)`  
- `markRead(userId, ids)` / `markAllRead(userId)`

- [ ] **Step 2: Commit** `feat(db): notifications table`

---

## Task B2: notificationService + emitters

**Files:**
- Create: `backend/src/services/notification.service.ts`
- Modify: `post.service.ts` `createPost`
- Modify: `badge.service.ts` `awardNewAuto` / admin grant path

Rules:

1. `create({ userId, type, actorId, … })` — **no-op if userId === actorId**.  
2. Wrap insert in try/catch; **log and swallow** so post create still returns 201.  
3. **thread_reply:** on `createPost`, load thread; if `thread.authorId !== userId`, notify thread author with `threadId`, `entityType: 'post'`, `entityId: post.id`, payload snippet.  
4. **badge_awarded:** for each newly awarded badge, notify recipient (`actorId` null or system).  
5. Skip like notifications in v1.

Optional unit test with mocked repo for “does not notify self”.

- [ ] **Commit** `feat(notifications): emit on reply and badge`

---

## Task B3: Notification HTTP API

**Files:**
- Create: `backend/src/routes/notification.routes.ts`
- Modify: `index.ts` → `app.route('/notifications', …)`

```
GET  /notifications?page&limit     requireAuth
GET  /notifications/unread-count   requireAuth
POST /notifications/read           requireAuth body: { ids: string[] } | { all: true }
```

Rewrite actor avatars with `toPublicMediaUrl`. Pagination shape like posts: `{ data, total, page, limit, totalPages }`.

- [ ] **Smoke:** reply as Bob on Alice’s thread → Alice unread-count ≥ 1; Bob unchanged; mark all → 0.

- [ ] **Commit** `feat(api): notifications list and mark-read`

---

## Task B4: Navbar bell + page

**Files:**
- Create: `frontend/src/api/notifications.ts`, composable `useNotifications.ts`
- Modify: `Navbar.vue` — bell only when authed; badge = unread count  
- Create: `NotificationsView.vue` + route `/notifications`  
- Poll unread every 45s + refetch on window focus

Click item: mark that id read, navigate `/thread/:threadId#post-:entityId` when applicable.

- [ ] **Acceptance B** from spec.  
- [ ] **Commit** `feat(ui): notification bell and inbox`

---

# Phase C — Unread / last-read

## Task C1: thread_reads schema + API

**Files:** schema + migration `0010_*`, repository, `thread.service` / routes

```sql
thread_reads (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id text NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, thread_id)
)
```

```
POST /threads/:id/read   requireAuth  body optional { at?: iso }
```

Upsert `last_read_at = now()` (or body.at).

Enrich `GET` threads-by-forum when optional auth present:

```
isUnread = lastActivityAt > coalesce(thread_reads.last_read_at, epoch)
lastActivityAt = max(thread.createdAt, lastPostAt)
```

**One join / left join**, no N+1.

- [ ] **Commit** `feat(threads): server-side last-read and isUnread`

---

## Task C2: Frontend unread

**Files:**
- `ForumView.vue` / thread list components — bold title or blue dot when `isUnread`  
- `ThreadDetailView.vue` — after successful thread+posts load, if authed call `POST /threads/:id/read`  
- **Remove** localStorage unread helpers from `Forum.vue` (or leave forum-level client as optional until forum_reads exists — prefer remove to avoid dual systems)

Guest: no unread UI, no 401 spam (only call mark-read when authed).

- [ ] **Acceptance C.**  
- [ ] **Commit** `feat(ui): unread indicators from server`

---

# Phase D — Quote + mentions

## Task D1: Quote button + replyToPostId

**Files:**
- Migration optional: `posts.reply_to_post_id text null references posts(id) on delete set null`  
- `CreatePostDTO` + Zod: optional `replyToPostId`  
- `post.service.createPost`: validate same thread; set column; notify parent author type `post_reply` (≠ self, ≠ already thread author double-spam: if parent author is also thread author, **one** notification is enough — prefer `post_reply` when replyTo set, else `thread_reply`)

**Frontend:** On each post in `ThreadDetailView`, “Quote” inserts into composer:

```markdown
> @Name ([post](/thread/TID#post-PID)):
> quoted lines...

```

Preserve blockquotes in `MarkdownRenderer` styles if weak.

- [ ] **Commit** `feat: quote reply and post_reply notifications`

---

## Task D2: Mentions

**Files:**
- Create: `backend/src/domain/mentions.ts` + tests  
  - Parse `[@name](user:ID)` → unique ids  
  - Cap 20  
  - Ignore invalid format  
- On create/update post (and thread content): parse server-side → `mention` notifications  
- `GET /users/suggest?q=` requireAuth + rate limit, limit 8, name ILIKE  
- Frontend: `@` typeahead in MarkdownEditor; insert stable markdown form  
- Renderer: `user:ID` → `/user/:id` links

- [ ] **Acceptance D.**  
- [ ] **Commit** `feat: @mentions with notifications`

---

# Phase E — Discovery

## Task E1: Sort & filter on forum thread list

**Files:** `thread.repository.findByForumId`, `thread.service`, `thread.routes` query params, `ForumView.vue` dropdown

| param | values |
|---|---|
| `sort` | `newest` (default), `recent_activity`, `most_liked`, `unanswered` |
| `filter` | `all`, `mine` (auth), `pinned` |

- `unanswered` → `replyCount = 0`  
- `most_liked` → join like counts  
- `mine` without auth → 401 or empty list (prefer **401** if filter=mine)

- [ ] **Commit** `feat(threads): sort and filter query params`

---

## Task E2: Leaderboard

**Files:** new route `GET /leaderboard?period=week|all&limit=20` public  
- `all`: order by `users.score`  
- `week`: count posts+threads in last 7 days per user  

Frontend: `/leaderboard` table rank / avatar / name / tier / stat. Navbar or home link.

- [ ] **Commit** `feat: weekly and all-time leaderboard`

---

# Phase F — Trust & ops (launch hygiene)

## Task F1: Rules + help pages

- Routes `/rules`, `/help` — Vue pages with static Thai markdown content (or fetch public sticky thread — static is faster).  
- Footer + RegisterView links.  
- Commit `feat(ui): rules and help pages`

## Task F2: Post rate limits

- Extend `rateLimit.ts` with **per-user** limiters keyed by `userId` (not only IP): e.g. 10 threads/hour, 30 posts/hour.  
- Attach on `POST /threads`, `POST /posts`.  
- Return 429 with clear message.  
- Commit `feat(security): per-user thread and post rate limits`

## Task F3: Announcements write restriction

- Column `forums.post_role_min text null` — values `null | 'user' | 'manager' | 'admin'`.  
- Seed Announcements as `manager`.  
- Enforce in `threadService.createThread` / `postService.createPost` via `forum-policy` helper + unit tests.  
- Commit `feat(forums): minimum role to post`

## Task F4 (optional capacity): board moderators

- Table `forum_moderators`  
- Policy: pin/lock/delete in that forum only  
- Admin UI assign — only if time remains after F1–F3

---

# Phase G — Explicitly deferred

Watch threads, reactions, websocket, email digest, PWA, polls, accepted answer, PM, calendar — **not in this plan**. Require new design specs.

---

## 4. Testing matrix

| Layer | What |
|---|---|
| Domain | `snippet`, `mentions`, forum post-role policy — mandatory `bun test` |
| Service | notification no-self; unread rule with mocks when practical |
| API | manual curl smoke per PR |
| Frontend | type-check; mention typeahead test only if non-trivial logic extracted |
| Perf | activity recent p95 goal <200ms; unread-count partial index |

---

## 5. Spec coverage checklist

| Spec requirement | Task |
|---|---|
| GET /activity/recent | A2 |
| GET /stats/public | A2 |
| Forum last activity fields | A3 |
| Home UI stats+activity+boards | A4 |
| Seed rules + boards | A5 |
| notifications table + API | B1–B3 |
| Emit reply/badge | B2 |
| Bell UI | B4 |
| Like notifs | **Deferred** (decision) |
| thread_reads + isUnread | C1–C2 |
| Quote + replyTo | D1 |
| Mentions | D2 |
| Sort/filter | E1 |
| Leaderboard | E2 |
| Tags | **Skipped** |
| Rules/help pages | F1 |
| Rate limit posts | F2 |
| Readonly announcements | F3 |
| Board mods | F4 optional |
| Phase G | Out of plan |

---

## 6. Execution notes

1. One migration **per phase** that needs schema (`0009` notifications, `0010` reads, `0011` reply_to / post_role_min, …).  
2. After each PR: `cd backend && bun test && bun run typecheck` and frontend type-check when UI touched.  
3. Deploy path (radxa): migrate → restart backend → rebuild frontend as usual.  
4. On execute: copy this plan to `docs/superpowers/plans/2026-08-12-forum-completeness.md` if it should live in-repo (`.claude/` is gitignored).

---

## 7. Suggested first execution slice

Start with **PR-A1 → A2 → A3** (Tasks A1–A5) until acceptance A is green, then B. Do not start G or tags unless product re-prioritizes.
