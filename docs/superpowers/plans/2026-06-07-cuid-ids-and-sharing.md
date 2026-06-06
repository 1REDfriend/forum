# CUID IDs + Thread/Post Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all sequential integer IDs with non-guessable 16-char CUID2 ids (preserving existing prod data), and add share-by-link + social preview for threads and posts.

**Architecture:** Drizzle/Postgres `serial` PKs and integer FKs become `text` columns defaulting to CUID2. A one-shot TypeScript migration script converts existing rows inside a single transaction by building old→new id maps and remapping every FK (including the polymorphic `reports.target_id`). Backend repos/services/routes and the Vue frontend switch their ID types from `number` to `string`. Sharing adds a frontend Share control plus a backend crawler endpoint (`/share/...`) wired through nginx user-agent sniffing so social cards get Open Graph meta.

**Tech Stack:** Bun, Elysia, Drizzle ORM, Postgres 16, `@paralleldrive/cuid2`, Vue 3 + Vite, nginx, Docker Compose.

**Reference spec:** `docs/superpowers/specs/2026-06-07-cuid-ids-and-sharing-design.md`

---

## File Structure

**Backend — create:**
- `backend/src/db/ids.ts` — `newId()` CUID2 generator (length 16).
- `backend/src/db/ids.test.ts` — unit test for `newId()`.
- `backend/scripts/migrate-to-cuid.ts` — one-shot data migration (DDL + data, one transaction).
- `backend/src/services/share.service.ts` — builds OG/Twitter meta HTML for a thread/post.
- `backend/src/services/share.service.test.ts` — unit test for meta HTML.
- `backend/src/routes/share.routes.ts` — `GET /share/thread/:id`, `GET /share/post/:id`.

**Backend — modify:**
- `backend/src/db/schema.ts` — all PKs/FKs `serial`/`integer` → `text`.
- `backend/src/types/index.ts` — `IdParam`, `CreateThreadDTO.forumId`, `CreatePostDTO.threadId`, `ReportDTO.targetId`, `JwtPayload.userId` → string.
- `backend/src/config/jwt.ts` — no change (verify only).
- `backend/src/services/auth.service.ts` — `generateAccessToken(userId: string)`.
- All 10 repositories under `backend/src/repositories/` — id params `number` → `string`.
- All services under `backend/src/services/` that take id params — `number` → `string`.
- All route files under `backend/src/routes/` using `IdParam` / `t.Numeric()` for ids — params → string (pagination stays numeric).
- `backend/src/db/seed.ts` — rely on `$defaultFn` (no manual serial assumptions).
- `backend/src/index.ts` — mount `shareRoutes`.
- `backend/package.json` — add `@paralleldrive/cuid2` dep + `migrate:cuid` script.

**Frontend — create:**
- `frontend/src/components/ShareButton.vue` — copy link + Web Share.
- `frontend/src/utils/share.ts` — build thread/post share URLs.
- `frontend/src/utils/share.test.ts` — unit test for URL builders.

**Frontend — modify:**
- `frontend/src/views/ThreadDetailView.vue` — drop `Number(props.id)`; add post anchor scroll/highlight; add ShareButton.
- `frontend/src/views/ForumView.vue`, `ProfileView.vue`, `ThreadCreateView.vue` — drop `parseInt`/`Number()` on ids.
- `frontend/src/api/*.ts` and `frontend/src/api/types.ts` — id fields typed `string`.

**Infra — modify:**
- `frontend/nginx.conf` — crawler UA sniff → proxy `/thread/:id` to backend `/share/thread/:id`.
- `docker-compose.yml` — ensure frontend can reach backend (shared network; already `default`).

---

## Task 1: CUID generator helper

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/db/ids.ts`
- Test: `backend/src/db/ids.test.ts`

- [ ] **Step 1: Add the dependency**

Run:
```bash
cd backend && bun add @paralleldrive/cuid2
```
Expected: `package.json` gains `"@paralleldrive/cuid2"` under dependencies; `bun.lock` updates.

- [ ] **Step 2: Write the failing test**

Create `backend/src/db/ids.test.ts`:
```ts
import { test, expect } from 'bun:test';
import { newId } from './ids.js';

test('newId returns a 16-char id', () => {
  expect(newId()).toHaveLength(16);
});

test('newId is url-safe (lowercase alnum)', () => {
  expect(newId()).toMatch(/^[a-z0-9]{16}$/);
});

test('newId is non-sequential and unique across many calls', () => {
  const ids = new Set(Array.from({ length: 5000 }, () => newId()));
  expect(ids.size).toBe(5000);
});
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `cd backend && bun test src/db/ids.test.ts`
Expected: FAIL — `Cannot find module './ids.js'`.

- [ ] **Step 3: Write the implementation**

Create `backend/src/db/ids.ts`:
```ts
import { init } from '@paralleldrive/cuid2';

// 16 chars: short, URL-safe, collision-resistant at forum scale, non-sequential.
export const newId = init({ length: 16 });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && bun test src/db/ids.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/bun.lock backend/src/db/ids.ts backend/src/db/ids.test.ts
git commit -m "feat(db): add cuid2 newId() generator"
```

---

## Task 2: Convert schema to text ids

This changes the Drizzle schema only. The DB itself is migrated in Task 3; do not run `drizzle-kit push` against a populated DB here.

**Files:**
- Modify: `backend/src/db/schema.ts`

- [ ] **Step 1: Update imports and every table**

In `backend/src/db/schema.ts`:
- Add `newId` import at top: `import { newId } from "./ids.js";`
- Remove `serial` from the `drizzle-orm/pg-core` import (no longer used).
- For every table, replace the PK line:
  ```ts
  id: serial("id").primaryKey(),
  ```
  with:
  ```ts
  id: text("id").primaryKey().$defaultFn(newId),
  ```
- Replace every FK column type `integer(...)` with `text(...)`, keeping name + `.references(...)` + `.notNull()` + `onDelete` exactly. Columns affected:
  - `forums.createdBy`
  - `threads.authorId`, `threads.forumId`
  - `posts.threadId`, `posts.authorId`
  - `passwordResetTokens.userId`
  - `refreshTokens.userId`
  - `likes.userId`, `likes.threadId`, `likes.postId`
  - `reports.reporterId`, `reports.targetId`  *(targetId is polymorphic — `text("target_id").notNull()`, still no `.references`)*
  - `userBadges.userId`
- Leave all non-id `integer` columns unchanged: `users.score`, `users.loginStreak`, `users.longestStreak`.

- [ ] **Step 2: Type-check**

Run: `cd backend && bunx tsc --noEmit`
Expected: errors ONLY in repositories/services/routes that pass `number` ids (fixed in Task 4). No errors inside `schema.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/schema.ts
git commit -m "feat(db): switch all PKs/FKs to text cuid columns"
```

---

## Task 3: Data migration script (preserve prod data)

A pure-SQL migration cannot generate CUIDs, so this is a TypeScript script run with Bun. It performs all DDL + data movement in ONE transaction and aborts (rolls back) if any validation check fails.

**Files:**
- Create: `backend/scripts/migrate-to-cuid.ts`
- Modify: `backend/package.json` (add script)

- [ ] **Step 1: Add the npm script**

In `backend/package.json` `"scripts"`, add:
```json
"migrate:cuid": "bun run scripts/migrate-to-cuid.ts"
```

- [ ] **Step 2: Write the migration script**

Create `backend/scripts/migrate-to-cuid.ts`:
```ts
import { Pool } from 'pg';
import { newId } from '../src/db/ids.js';

// Tables whose integer PK must be remapped, in FK-dependency order.
// Each entry: table name + the FK columns on OTHER tables that point at it.
const POOL = new Pool({ connectionString: process.env.DATABASE_URL });

// Every table that has an integer `id` to convert.
const TABLES = [
  'users',
  'forums',
  'threads',
  'posts',
  'likes',
  'reports',
  'user_badges',
  'password_reset_tokens',
  'refresh_tokens',
] as const;

// FK columns to remap: childTable.column references parentTable.id
const FOREIGN_KEYS: { child: string; column: string; parent: string }[] = [
  { child: 'forums', column: 'created_by', parent: 'users' },
  { child: 'threads', column: 'author_id', parent: 'users' },
  { child: 'threads', column: 'forum_id', parent: 'forums' },
  { child: 'posts', column: 'thread_id', parent: 'threads' },
  { child: 'posts', column: 'author_id', parent: 'users' },
  { child: 'likes', column: 'user_id', parent: 'users' },
  { child: 'likes', column: 'thread_id', parent: 'threads' },
  { child: 'likes', column: 'post_id', parent: 'posts' },
  { child: 'reports', column: 'reporter_id', parent: 'users' },
  { child: 'user_badges', column: 'user_id', parent: 'users' },
  { child: 'password_reset_tokens', column: 'user_id', parent: 'users' },
  { child: 'refresh_tokens', column: 'user_id', parent: 'users' },
];

async function main() {
  const client = await POOL.connect();
  try {
    await client.query('BEGIN');

    // 1. Build an id map per table: temp table old_id(int) -> new_id(text).
    for (const t of TABLES) {
      await client.query(
        `CREATE TEMP TABLE ${t}_idmap (old_id int PRIMARY KEY, new_id text NOT NULL) ON COMMIT DROP`,
      );
      const { rows } = await client.query(`SELECT id FROM ${t}`);
      for (const r of rows) {
        await client.query(`INSERT INTO ${t}_idmap (old_id, new_id) VALUES ($1, $2)`, [
          r.id,
          newId(),
        ]);
      }
      console.log(`mapped ${rows.length} rows of ${t}`);
    }

    // 2. Drop ALL foreign-key constraints on these tables (names vary; drop dynamically).
    await client.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT conname, conrelid::regclass AS tbl
          FROM pg_constraint
          WHERE contype = 'f'
            AND conrelid::regclass::text = ANY (ARRAY[
              'forums','threads','posts','likes','reports','user_badges',
              'password_reset_tokens','refresh_tokens'])
        LOOP
          EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
        END LOOP;
      END $$;
    `);

    // 3. Convert each table's own id column to text via its idmap.
    for (const t of TABLES) {
      await client.query(`ALTER TABLE ${t} ADD COLUMN id_new text`);
      await client.query(
        `UPDATE ${t} SET id_new = m.new_id FROM ${t}_idmap m WHERE ${t}.id = m.old_id`,
      );
    }

    // 4. Convert each FK column to text via the PARENT idmap.
    for (const fk of FOREIGN_KEYS) {
      const col = fk.column;
      await client.query(`ALTER TABLE ${fk.child} ADD COLUMN ${col}_new text`);
      await client.query(
        `UPDATE ${fk.child} SET ${col}_new = m.new_id
         FROM ${fk.parent}_idmap m
         WHERE ${fk.child}.${col} = m.old_id`,
      );
    }

    // 5. Polymorphic reports.target_id -> text, remapped per target_type.
    await client.query(`ALTER TABLE reports ADD COLUMN target_id_new text`);
    for (const [type, parent] of [
      ['thread', 'threads'],
      ['post', 'posts'],
      ['user', 'users'],
    ] as const) {
      await client.query(
        `UPDATE reports SET target_id_new = m.new_id
         FROM ${parent}_idmap m
         WHERE reports.target_type = $1 AND reports.target_id = m.old_id`,
        [type],
      );
    }

    // 6. VALIDATION — abort if anything is inconsistent.
    // 6a. Every id_new is populated.
    for (const t of TABLES) {
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM ${t} WHERE id_new IS NULL`,
      );
      if (rows[0].n > 0) throw new Error(`VALIDATION: ${t} has ${rows[0].n} null id_new`);
    }
    // 6b. NOT-NULL FKs must all be remapped (no orphans). Nullable FKs may stay null
    //     only where the original was null.
    const NOT_NULL_FKS = new Set([
      'threads.author_id',
      'threads.forum_id',
      'posts.thread_id',
      'posts.author_id',
      'likes.user_id',
      'reports.reporter_id',
      'user_badges.user_id',
      'password_reset_tokens.user_id',
      'refresh_tokens.user_id',
    ]);
    for (const fk of FOREIGN_KEYS) {
      const key = `${fk.child}.${fk.column}`;
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM ${fk.child}
         WHERE ${fk.column} IS NOT NULL AND ${fk.column}_new IS NULL`,
      );
      if (rows[0].n > 0) throw new Error(`VALIDATION: ${key} has ${rows[0].n} orphaned rows`);
      if (NOT_NULL_FKS.has(key)) {
        const { rows: nn } = await client.query(
          `SELECT count(*)::int AS n FROM ${fk.child} WHERE ${fk.column}_new IS NULL`,
        );
        if (nn[0].n > 0) throw new Error(`VALIDATION: ${key} (NOT NULL) has ${nn[0].n} nulls`);
      }
    }
    // 6c. reports.target_id all remapped.
    {
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM reports WHERE target_id IS NOT NULL AND target_id_new IS NULL`,
      );
      if (rows[0].n > 0)
        throw new Error(`VALIDATION: reports.target_id has ${rows[0].n} orphaned rows`);
    }

    // 7. Swap columns: drop old PKs + old columns, rename *_new -> original.
    for (const t of TABLES) {
      await client.query(`ALTER TABLE ${t} DROP CONSTRAINT ${t}_pkey`);
      await client.query(`ALTER TABLE ${t} DROP COLUMN id`);
      await client.query(`ALTER TABLE ${t} RENAME COLUMN id_new TO id`);
      await client.query(`ALTER TABLE ${t} ALTER COLUMN id SET NOT NULL`);
      await client.query(`ALTER TABLE ${t} ADD PRIMARY KEY (id)`);
    }
    for (const fk of FOREIGN_KEYS) {
      await client.query(`ALTER TABLE ${fk.child} DROP COLUMN ${fk.column}`);
      await client.query(`ALTER TABLE ${fk.child} RENAME COLUMN ${fk.column}_new TO ${fk.column}`);
    }
    await client.query(`ALTER TABLE reports DROP COLUMN target_id`);
    await client.query(`ALTER TABLE reports RENAME COLUMN target_id_new TO target_id`);
    await client.query(`ALTER TABLE reports ALTER COLUMN target_id SET NOT NULL`);

    // 8. Re-apply NOT NULL on required FK columns.
    for (const key of NOT_NULL_FKS) {
      const [tbl, col] = key.split('.');
      await client.query(`ALTER TABLE ${tbl} ALTER COLUMN ${col} SET NOT NULL`);
    }

    // 9. Re-add foreign keys with ON DELETE CASCADE (matches schema.ts).
    for (const fk of FOREIGN_KEYS) {
      await client.query(
        `ALTER TABLE ${fk.child}
         ADD CONSTRAINT ${fk.child}_${fk.column}_fk
         FOREIGN KEY (${fk.column}) REFERENCES ${fk.parent}(id) ON DELETE CASCADE`,
      );
    }

    await client.query('COMMIT');
    console.log('migration committed OK');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('migration ROLLED BACK:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await POOL.end();
  }
}

main();
```

- [ ] **Step 3: Manual dry-run against a disposable seeded DB**

```bash
cd backend
# point DATABASE_URL at a throwaway db, apply existing migrations, seed it
bunx drizzle-kit migrate   # (or your existing migrate command) using OLD schema first
# checkout the integer-schema commit if needed to seed integer data, then:
bun run seed               # if a seed script exists; otherwise insert a few rows manually
bun run migrate:cuid
```
Expected: console logs `mapped N rows of <table>` for each table, then `migration committed OK`. Re-running it on the now-text DB will error (no integer `id`); that is expected — it is one-shot.

- [ ] **Step 4: Verify ids and relations**

```bash
psql "$DATABASE_URL" -c "SELECT id FROM threads LIMIT 3;"          # 16-char cuids
psql "$DATABASE_URL" -c "SELECT count(*) FROM posts p LEFT JOIN threads t ON p.thread_id=t.id WHERE t.id IS NULL;"  # must be 0
```
Expected: thread ids are 16-char strings; orphan count is `0`.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/migrate-to-cuid.ts backend/package.json
git commit -m "feat(db): one-shot data migration to cuid ids"
```

---

## Task 4: Backend repos / services / routes — number → string ids

The compiler is the checklist: after Task 2, `tsc` lists every `number` id site. Fix them all.

**Files:**
- Modify: `backend/src/types/index.ts`
- Modify: all 10 files in `backend/src/repositories/`
- Modify: id-taking services in `backend/src/services/`
- Modify: route files in `backend/src/routes/` using `IdParam`/`t.Numeric()` for ids
- Modify: `backend/src/services/auth.service.ts`

- [ ] **Step 1: Update shared types**

In `backend/src/types/index.ts`:
- `export const IdParam = t.Object({ id: t.Numeric() });` → `t.Object({ id: t.String({ minLength: 1 }) });`
- `CreateThreadDTO.forumId`: `t.Integer({ minimum: 1 })` → `t.String({ minLength: 1 })`
- `CreatePostDTO.threadId`: `t.Integer({ minimum: 1 })` → `t.String({ minLength: 1 })`
- `ReportDTO.targetId`: `t.Integer({ minimum: 1 })` → `t.String({ minLength: 1 })`
- `JwtPayload.userId`: `number` → `string`
- Leave `Pagination`, `AdminPagination`, `ReportQuery` (`page`/`limit`) as `t.Numeric` — those are real numbers.

- [ ] **Step 2: Update route param schemas that are ids**

In `backend/src/routes/thread.routes.ts` and `post.routes.ts`, replace the inline
`t.Object({ forumId: t.Numeric() })` / `t.Object({ threadId: t.Numeric() })`
with `t.Object({ forumId: t.String({ minLength: 1 }) })` /
`t.Object({ threadId: t.String({ minLength: 1 }) })`.
In `admin.routes.ts`, `forum.routes.ts`, `like.routes.ts`, `user.routes.ts`: any
route using `IdParam` is already fixed via Step 1; any inline `t.Numeric()` used
for an **id** (not page/limit) → `t.String({ minLength: 1 })`.

- [ ] **Step 3: Update repositories**

In each file under `backend/src/repositories/`, change every method parameter that
is an id from `: number` to `: string` (e.g. `findById(id: string)`,
`findByForumId(forumId: string, ...)`, `create(reporterId: string, ..., targetId: string, ...)`).
Do not change `page`/`limit`/`offset`/`count` numbers. Drizzle `eq()` works
unchanged with string columns.

- [ ] **Step 4: Update services**

In each file under `backend/src/services/`, change id parameters from `number` to
`string` to match the repositories and route handlers. In
`auth.service.ts`, change `generateAccessToken(userId: number)` →
`generateAccessToken(userId: string)`.

- [ ] **Step 5: Type-check until clean**

Run: `cd backend && bunx tsc --noEmit`
Expected: no errors. Repeat Steps 3-4 for any remaining reported `number`/`string`
mismatches until clean.

- [ ] **Step 6: Run the backend test suite**

Run: `cd backend && bun test`
Expected: existing domain tests + `ids.test.ts` pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src
git commit -m "refactor(api): switch id params from number to string (cuid)"
```

---

## Task 5: Seed script uses cuid

**Files:**
- Modify: `backend/src/db/seed.ts`

- [ ] **Step 1: Inspect the seed**

Read `backend/src/db/seed.ts`. If it inserts rows without specifying `id`, the
schema `$defaultFn(newId)` already supplies cuids — no change needed beyond
removing any hard-coded integer ids or `id` references used to wire relations.

- [ ] **Step 2: Wire relations by returned id**

Where the seed links rows (e.g. a thread's `forumId`), capture the parent's id
from the insert `.returning()` result and pass that string into children, instead
of assuming `1, 2, 3...`. Example pattern:
```ts
const [forum] = await db.insert(forums).values({ name: 'General', createdBy: user.id }).returning();
await db.insert(threads).values({ title: 'Hi', content: '...', authorId: user.id, forumId: forum.id });
```

- [ ] **Step 3: Run the seed against a fresh dev DB**

Run: `cd backend && bun run seed` (against an empty dev DB created from the new schema).
Expected: completes; `SELECT id FROM forums LIMIT 1;` returns a 16-char cuid.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/seed.ts
git commit -m "chore(db): seed wires relations by returned cuid"
```

---

## Task 6: Frontend id types — number → string

**Files:**
- Modify: `frontend/src/api/types.ts` and `frontend/src/api/*.ts`
- Modify: `frontend/src/views/ThreadDetailView.vue`, `ForumView.vue`, `ProfileView.vue`, `ThreadCreateView.vue`

- [ ] **Step 1: Update API id types**

In `frontend/src/api/types.ts`, change every entity `id` field and id-bearing FK
field (e.g. `threadId`, `forumId`, `authorId`, `userId`, `postId`, `targetId`)
from `number` to `string`. Update any function signatures in
`frontend/src/api/*.ts` that accept ids to `string`.

- [ ] **Step 2: Remove numeric coercion in views**

- `ThreadDetailView.vue:69` `const threadId = Number(props.id);` → `const threadId = props.id;`
- `ThreadDetailView.vue:101` `threadId: Number(props.id)` → `threadId: props.id`
- In `ForumView.vue`, `ProfileView.vue`, `ThreadCreateView.vue`: replace every
  `parseInt(...)` / `Number(...)` applied to a route param or entity id with the
  raw string value. Leave numeric coercion of pagination/counts alone.

- [ ] **Step 3: Type-check + unit tests**

Run: `cd frontend && npm run build-only && npm run test:unit`
Expected: build succeeds; existing unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "refactor(web): treat entity ids as strings (cuid)"
```

---

## Task 7: Share URL utility + ShareButton component

**Files:**
- Create: `frontend/src/utils/share.ts`
- Test: `frontend/src/utils/share.test.ts`
- Create: `frontend/src/components/ShareButton.vue`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/share.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { threadShareUrl, postShareUrl } from './share';

describe('share urls', () => {
  it('builds a thread url', () => {
    expect(threadShareUrl('abc123', 'https://forum.example')).toBe(
      'https://forum.example/thread/abc123',
    );
  });
  it('builds a post url with anchor', () => {
    expect(postShareUrl('abc123', 'p9', 'https://forum.example')).toBe(
      'https://forum.example/thread/abc123#post-p9',
    );
  });
  it('strips a trailing slash from origin', () => {
    expect(threadShareUrl('x', 'https://forum.example/')).toBe('https://forum.example/thread/x');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/share.test.ts`
Expected: FAIL — cannot resolve `./share`.

- [ ] **Step 3: Implement the utility**

Create `frontend/src/utils/share.ts`:
```ts
function origin(base?: string): string {
  return (base ?? window.location.origin).replace(/\/$/, '');
}

export function threadShareUrl(threadId: string, base?: string): string {
  return `${origin(base)}/thread/${threadId}`;
}

export function postShareUrl(threadId: string, postId: string, base?: string): string {
  return `${origin(base)}/thread/${threadId}#post-${postId}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/share.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Build the ShareButton component**

Create `frontend/src/components/ShareButton.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ url: string; title?: string }>();
const copied = ref(false);

async function share() {
  if (navigator.share) {
    try {
      await navigator.share({ title: props.title ?? document.title, url: props.url });
      return;
    } catch {
      // user cancelled or unsupported — fall through to copy
    }
  }
  try {
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // clipboard blocked — last resort prompt
    window.prompt('Copy this link', props.url);
  }
}
</script>

<template>
  <button type="button" class="share-btn" @click="share">
    {{ copied ? 'Copied!' : 'Share' }}
  </button>
</template>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/share.ts frontend/src/utils/share.test.ts frontend/src/components/ShareButton.vue
git commit -m "feat(web): share url helpers + ShareButton component"
```

---

## Task 8: Wire Share into the thread view + post anchors

**Files:**
- Modify: `frontend/src/views/ThreadDetailView.vue`

- [ ] **Step 1: Render the thread Share button**

Import and place `ShareButton` in the thread header:
```vue
import ShareButton from '../components/ShareButton.vue';
import { threadShareUrl, postShareUrl } from '../utils/share';
```
```vue
<ShareButton :url="threadShareUrl(props.id)" :title="thread?.title" />
```

- [ ] **Step 2: Give each post an anchor id + Share button**

On the element rendered for each post in the v-for, add `:id="'post-' + post.id"`
and a per-post share control:
```vue
<ShareButton :url="postShareUrl(props.id, post.id)" :title="thread?.title" />
```

- [ ] **Step 3: Scroll to + highlight the anchored post on load**

After posts are loaded (in the existing onMounted/after-fetch path), add:
```ts
import { nextTick } from 'vue';
// ...
const hash = window.location.hash; // e.g. "#post-p9"
if (hash.startsWith('#post-')) {
  await nextTick();
  const el = document.getElementById(hash.slice(1));
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('post-highlight');
    setTimeout(() => el.classList.remove('post-highlight'), 2000);
  }
}
```
Add a `.post-highlight` style (e.g. a brief background flash) to the component's
`<style>` block.

- [ ] **Step 4: Manual verify**

Run the frontend dev server, open a thread, click the thread Share button (expect
"Copied!" or the native share sheet), then open a `#post-<id>` URL and confirm it
scrolls to and highlights that post.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/ThreadDetailView.vue
git commit -m "feat(web): share buttons + post anchor scroll/highlight"
```

---

## Task 9: Backend share/OG endpoint

**Files:**
- Create: `backend/src/services/share.service.ts`
- Test: `backend/src/services/share.service.test.ts`
- Create: `backend/src/routes/share.routes.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write the failing test for the meta builder**

Create `backend/src/services/share.service.test.ts`:
```ts
import { test, expect } from 'bun:test';
import { renderOgHtml } from './share.service.js';

test('renders escaped OG + twitter meta with a redirect', () => {
  const html = renderOgHtml({
    title: 'Hello & <world>',
    description: 'a "quoted" snippet',
    url: 'https://forum.example/thread/abc',
    image: 'https://forum.example/img.png',
  });
  expect(html).toContain('<meta property="og:title" content="Hello &amp; &lt;world&gt;">');
  expect(html).toContain('<meta property="og:url" content="https://forum.example/thread/abc">');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  expect(html).toContain('url=https://forum.example/thread/abc'); // meta refresh redirect
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && bun test src/services/share.service.test.ts`
Expected: FAIL — cannot find `./share.service.js`.

- [ ] **Step 3: Implement the meta builder + data fetch**

Create `backend/src/services/share.service.ts`:
```ts
import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface OgMeta {
  title: string;
  description: string;
  url: string;
  image?: string;
}

export function renderOgHtml(m: OgMeta): string {
  const img = m.image ? `<meta property="og:image" content="${esc(m.image)}">` : '';
  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(m.title)}</title>
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:url" content="${esc(m.url)}">
${img}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.description)}">
<meta http-equiv="refresh" content="0; url=${m.url}">
</head><body>Redirecting to <a href="${esc(m.url)}">${esc(m.url)}</a></body></html>`;
}

function snippet(content: string): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  return oneLine.length > 200 ? oneLine.slice(0, 197) + '...' : oneLine;
}

export const shareService = {
  async threadOg(id: string): Promise<string | null> {
    const thread = await threadRepository.findById(id);
    if (!thread) return null;
    return renderOgHtml({
      title: thread.title,
      description: snippet(thread.content),
      url: `${FRONTEND_URL}/thread/${id}`,
      image: thread.author?.avatar ?? undefined,
    });
  },
  async postOg(id: string): Promise<string | null> {
    const post = await postRepository.findById(id);
    if (!post) return null;
    return renderOgHtml({
      title: 'Reply in thread',
      description: snippet(post.content),
      url: `${FRONTEND_URL}/thread/${post.threadId}#post-${id}`,
    });
  },
};
```
*Note:* confirm `postRepository.findById` returns `content` + `threadId` (and a
`author.avatar` on the thread join). Adjust field access to match the actual
repository return shapes; add a `findById` to `post.repository.ts` if missing.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && bun test src/services/share.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the routes**

Create `backend/src/routes/share.routes.ts`:
```ts
import { Elysia, t } from 'elysia';
import { shareService } from '../services/share.service.js';

const html = (body: string) =>
  new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });

export const shareRoutes = new Elysia({ prefix: '/share', tags: ['Share'] })
  .get(
    '/thread/:id',
    async ({ params }) => {
      const out = await shareService.threadOg(params.id);
      return out ? html(out) : new Response('Not found', { status: 404 });
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) },
  )
  .get(
    '/post/:id',
    async ({ params }) => {
      const out = await shareService.postOg(params.id);
      return out ? html(out) : new Response('Not found', { status: 404 });
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) },
  );
```

- [ ] **Step 6: Mount the routes**

In `backend/src/index.ts`, import `shareRoutes` and add `.use(shareRoutes)`
alongside the other route registrations.

- [ ] **Step 7: Manual verify**

Run the backend, then:
```bash
curl -s http://localhost:3636/share/thread/<a-real-cuid> | grep og:title
```
Expected: an `og:title` meta line with the thread title.

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/share.service.ts backend/src/services/share.service.test.ts backend/src/routes/share.routes.ts backend/src/index.ts
git commit -m "feat(api): /share endpoint emitting OG/Twitter meta"
```

---

## Task 10: nginx crawler routing for OG previews

**Files:**
- Modify: `frontend/nginx.conf`
- Verify: `docker-compose.yml` (frontend + backend share the `default` network — already true)

- [ ] **Step 1: Add crawler detection + proxy**

Replace `frontend/nginx.conf` with:
```nginx
map $http_user_agent $is_crawler {
    default 0;
    "~*facebookexternalhit|Twitterbot|Slackbot|LINE|Discordbot|WhatsApp|TelegramBot|Pinterest|redditbot|Googlebot|bingbot|Applebot|SkypeUriPreview" 1;
}

server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Crawlers hitting a thread URL get server-rendered OG meta from the backend.
    location ~ ^/thread/([^/#?]+)$ {
        if ($is_crawler) {
            proxy_pass http://backend:3636/share/thread/$1;
        }
        try_files $uri /index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```
*Note:* `backend` is the compose service name; port `3636` is `BACKEND_PORT`. If
`BACKEND_PORT` differs in the prod `.env`, match it here.

- [ ] **Step 2: Verify compose networking**

Confirm in `docker-compose.yml` that `frontend` and `backend` are on the same
network (both default to the compose `default` network — no change needed). The
frontend nginx resolves `backend` via Docker DNS.

- [ ] **Step 3: Build + smoke test the crawler path**

```bash
docker compose build frontend
docker compose up -d
# simulate a crawler:
curl -s -A "Twitterbot/1.0" http://localhost:8080/thread/<a-real-cuid> | grep og:title
# simulate a human:
curl -s -A "Mozilla/5.0" http://localhost:8080/thread/<a-real-cuid> | grep -c "<div id=\"app\">"
```
Expected: crawler request returns OG html (has `og:title`); human request returns
the SPA `index.html` (app mount point present).

- [ ] **Step 4: Commit**

```bash
git add frontend/nginx.conf
git commit -m "feat(infra): nginx serves OG meta to crawlers on /thread/:id"
```

---

## Task 11: Local end-to-end rollout (Phase A)

**Files:** none (verification only)

- [ ] **Step 1: Fresh stack from new schema**

Bring up Postgres, apply the schema (new dev DB), seed it. Confirm `bun test`
(backend) and `npm run test:unit` (frontend) both pass.

- [ ] **Step 2: Integer→cuid migration rehearsal**

On a SEPARATE disposable DB populated with integer-era data (restore an old dump
or seed the pre-migration schema), run `bun run migrate:cuid`. Confirm it prints
`migration committed OK` and the verification queries from Task 3 Step 4 pass.

- [ ] **Step 3: Browser smoke test**

Start backend + frontend. Verify: thread/post pages load with cuid URLs; creating
a thread/post works; share button copies/share-sheets; opening a `#post-<id>` URL
scrolls+highlights; `curl -A Twitterbot .../thread/<id>` returns OG meta.

- [ ] **Step 4: Push the branch**

```bash
git push -u origin feat/cuid-ids-and-sharing
```

---

## Task 12: Radxa prod dry-run + cutover (Phase B)

**Files:** none (deployment). Reference: memory `forum-production-deployment`.

> SSH: `ssh radxa@192.168.1.104` (password supplied ad hoc). Repo: `~/github/forum`.
> Services: `forum-backend` :3636, `forum-db` :5843→5432, `forum-frontend` :8080.
> Public: site `https://forum.supakorn.xyz`, API `https://forum-api.supakorn.xyz`.

- [ ] **Step 1: Pull the branch on the Radxa**

```bash
ssh radxa@192.168.1.104
cd ~/github/forum
git fetch origin && git checkout feat/cuid-ids-and-sharing && git pull
```

- [ ] **Step 2: Backup the live DB**

```bash
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > ~/forum-backup-$(date +%Y%m%d-%H%M).sql
```
Expected: a non-empty `.sql` dump in the home dir. Keep it — this is the rollback.

- [ ] **Step 3: Dry-run the migration on a COPY of prod data**

```bash
# create a throwaway db and load the dump into it, then run the migration against it
docker compose exec -T db createdb -U "$POSTGRES_USER" forum_dryrun
cat ~/forum-backup-*.sql | docker compose exec -T db psql -U "$POSTGRES_USER" -d forum_dryrun
# run the migration pointed at the dryrun db (override DATABASE_URL for one invocation)
docker compose run --rm \
  -e DATABASE_URL="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/forum_dryrun" \
  backend bun run scripts/migrate-to-cuid.ts
```
Expected: `migration committed OK` with per-table mapped counts. If it prints
`migration ROLLED BACK`, STOP — fix the cause before touching live data.
Drop the dryrun db when done: `docker compose exec -T db dropdb -U "$POSTGRES_USER" forum_dryrun`.

- [ ] **Step 4: Cutover (maintenance window)**

```bash
docker compose stop backend                       # take the API offline
docker compose run --rm backend bun run scripts/migrate-to-cuid.ts   # migrate LIVE db
docker compose build backend frontend
docker compose up -d                              # bring everything back on new images
```
Expected: migration commits OK; containers healthy (`docker compose ps`).

- [ ] **Step 5: Verify prod**

- `https://forum.supakorn.xyz` loads; open a thread — URL shows a cuid.
- Create a reply; share a post link; confirm `#post-<id>` scroll works.
- `curl -s -A "Twitterbot/1.0" https://forum.supakorn.xyz/thread/<cuid> | grep og:title`.
- Run a link through a social card validator against the public URL.

- [ ] **Step 6: On failure — rollback**

```bash
docker compose down
# restore the dump into a fresh db volume, redeploy the previous (main) images
git checkout main && docker compose build backend frontend
cat ~/forum-backup-*.sql | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose up -d
```

---

## Self-Review Notes

- **Spec coverage:** CUID2 len-16 (T1,T2), all-tables PK swap (T2,T3), data-preserving FK remap incl. polymorphic `reports.target_id` (T3), backend/JWT id types (T4), seed (T5), frontend id types (T6), share copy+WebShare (T7,T8), post anchor (T8), OG meta (T9), nginx crawler delivery (T10), local test (T11), Radxa dry-run+cutover+rollback (T12). All spec sections mapped.
- **One-shot migration:** the script is not idempotent by design (it consumes integer ids). Re-running on an already-migrated DB errors out harmlessly. Always dry-run on a copy first (T12 S3).
- **Verified (T9):** `post.repository.findById(id)` returns `PostSelectType` (full row incl. `content` + `threadId`) — `share.service.postOg` can use it directly. `thread.repository.findById` returns the joined `author` object (`avatar` available for `og:image`).
