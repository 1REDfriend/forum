# TanStack Query Adoption (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all server-data fetching in the Vue frontend to `@tanstack/vue-query`, replacing per-component `ref`/`loading`/`onMounted` fetch state.

**Architecture:** The existing `frontend/src/api/*` classes stay as the raw fetch layer (they own auth headers, refresh, and the `{error}` contract). A new `frontend/src/composables/` directory wraps them in `useQuery`/`useMutation` composables with hierarchical query keys. Views consume composables. Pinia keeps auth/session (`stores/auth.ts`) and UI state (`stores/ui.ts`); server data lives in the Query cache. No SSR, no optimistic updates.

**Tech Stack:** Vue 3, `@tanstack/vue-query` v5, Pinia (unchanged), existing `ApiClient`.

**Spec:** `docs/superpowers/specs/2026-07-13-white-theme-hono-tanstack-design.md`

**Precondition:** Phase 1a (white-theme reskin) is merged — this phase edits the same `.vue` files.

**Query key conventions (use exactly these everywhere):**

| Data | Key |
|---|---|
| all forums | `['forums']` |
| one forum | `['forum', id]` |
| threads of a forum | `['forum', forumId, 'threads', page]` |
| all threads (landing) | `['threads']` |
| one thread | `['thread', id]` |
| posts of a thread | `['thread', threadId, 'posts', page]` |
| my profile | `['me']` |
| public profile | `['user', id]` |
| search | `['search', q]` |
| admin stats / activity | `['admin', 'stats']` / `['admin', 'activity']` |
| admin lists | `['admin', 'users', page, search]` etc. (same pattern per resource) |
| badge catalog | `['badges']` |

`v5` note: vue-query v5 uses object syntax only — `useQuery({ queryKey, queryFn, ... })`; reactive keys are supported by passing refs/computed inside the key array.

---

### Task 1: Install + QueryClient setup

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/src/main.ts`

- [ ] **Step 1: Install**

```bash
cd frontend && npm install @tanstack/vue-query
```

- [ ] **Step 2: Register the plugin in `frontend/src/main.ts`:**

```ts
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import vue3GoogleLogin from 'vue3-google-login'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Server data cache: lists stay fresh for 30s, one retry on failure
// (the ApiClient already retries auth via token refresh internally).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})
app.use(VueQueryPlugin, { queryClient })

app.use(vue3GoogleLogin, {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id'
})

app.mount('#app')
```

- [ ] **Step 3: Verify build + existing tests**

```bash
cd frontend && npm run type-check && npm run test:unit -- --run
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/main.ts
git commit -m "feat(query): install @tanstack/vue-query and register QueryClient"
```

---

### Task 2: Forum + thread + post composables

**Files:**
- Create: `frontend/src/composables/useForums.ts`
- Create: `frontend/src/composables/useThreads.ts`
- Create: `frontend/src/composables/usePosts.ts`

- [ ] **Step 1: Create `frontend/src/composables/useForums.ts`:**

```ts
import { computed, unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { forumsApi } from '../api/index.js';
import type { CreateForumDTO, UpdateForumDTO } from '../api/types.js';

export function useForums() {
  return useQuery({
    queryKey: ['forums'],
    queryFn: () => forumsApi.getAllForums(),
  });
}

export function useForum(id: MaybeRef<string>) {
  return useQuery({
    queryKey: ['forum', id],
    queryFn: () => forumsApi.getForumById(unref(id)),
    enabled: computed(() => !!unref(id)),
  });
}

export function useCreateForum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateForumDTO) => forumsApi.createForum(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forums'] }),
  });
}

export function useUpdateForum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateForumDTO }) =>
      forumsApi.updateForum(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['forums'] });
      qc.invalidateQueries({ queryKey: ['forum', id] });
    },
  });
}

export function useDeleteForum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => forumsApi.deleteForum(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forums'] }),
  });
}
```

(Adjust method names to whatever `ForumsApi` actually exposes — check `frontend/src/api/forums.ts`; e.g. if there is no `updateForum`/`deleteForum` method, skip those composables.)

- [ ] **Step 2: Create `frontend/src/composables/useThreads.ts`:**

```ts
import { computed, unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { threadsApi } from '../api/index.js';
import type { CreateThreadDTO, UpdateThreadDTO } from '../api/types.js';

export function useThreads() {
  return useQuery({
    queryKey: ['threads'],
    queryFn: () => threadsApi.getAllThreads(),
  });
}

export function useForumThreads(forumId: MaybeRef<string>, page: MaybeRef<number>) {
  return useQuery({
    queryKey: ['forum', forumId, 'threads', page],
    queryFn: () => threadsApi.getThreadsByForumId(unref(forumId), unref(page)),
    enabled: computed(() => !!unref(forumId)),
  });
}

export function useThread(id: MaybeRef<string>) {
  return useQuery({
    queryKey: ['thread', id],
    queryFn: () => threadsApi.getThreadById(unref(id)),
    enabled: computed(() => !!unref(id)),
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateThreadDTO) => threadsApi.createThread(data),
    onSuccess: (_res, data) => {
      qc.invalidateQueries({ queryKey: ['forum', data.forumId, 'threads'] });
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useUpdateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateThreadDTO }) =>
      threadsApi.updateThread(id, data),
    onSuccess: (_res, { id }) => qc.invalidateQueries({ queryKey: ['thread', id] }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => threadsApi.deleteThread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] });
      qc.invalidateQueries({ queryKey: ['forum'] }); // covers all forum thread lists
    },
  });
}
```

(Same caveat: match the real `ThreadsApi` method names/signatures from `frontend/src/api/threads.ts`, including pagination params.)

- [ ] **Step 3: Create `frontend/src/composables/usePosts.ts`:**

```ts
import { unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { postsApi } from '../api/index.js';
import type { CreatePostDTO, UpdatePostDTO } from '../api/types.js';

export function useThreadPosts(threadId: MaybeRef<string>, page: MaybeRef<number>) {
  return useQuery({
    queryKey: ['thread', threadId, 'posts', page],
    queryFn: () => postsApi.getPostsByThreadId(unref(threadId), unref(page)),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostDTO) => postsApi.createPost(data),
    onSuccess: (_res, data) => {
      qc.invalidateQueries({ queryKey: ['thread', data.threadId, 'posts'] });
      qc.invalidateQueries({ queryKey: ['thread', data.threadId] }); // reply count on the thread
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostDTO }) => postsApi.updatePost(id, data),
    // The post's thread id isn't in the mutation args; invalidate all thread post lists.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thread'] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsApi.deletePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thread'] }),
  });
}
```

- [ ] **Step 4: Typecheck**

```bash
cd frontend && npm run type-check
```
Expected: PASS (fix any api-method-name mismatches now).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables
git commit -m "feat(query): forum, thread, post composables with hierarchical keys"
```

---

### Task 3: Likes, users, search, admin composables

**Files:**
- Create: `frontend/src/composables/useLikes.ts`
- Create: `frontend/src/composables/useUsers.ts`
- Create: `frontend/src/composables/useSearch.ts`
- Create: `frontend/src/composables/useAdmin.ts`

- [ ] **Step 1: Create `frontend/src/composables/useLikes.ts`:**

```ts
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { likesApi } from '../api/index.js';

export function useToggleThreadLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => likesApi.toggleThreadLike(threadId),
    onSuccess: (_res, threadId) => {
      qc.invalidateQueries({ queryKey: ['thread', threadId] });
      qc.invalidateQueries({ queryKey: ['threads'] });
      qc.invalidateQueries({ queryKey: ['forum'] }); // thread lists carry like counts
    },
  });
}

export function useTogglePostLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => likesApi.togglePostLike(postId),
    // Post like counts live in thread post lists.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thread'] }),
  });
}
```

- [ ] **Step 2: Create `frontend/src/composables/useUsers.ts`:**

```ts
import { computed, unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { usersApi } from '../api/index.js';
import type { UpdateUserDTO } from '../api/types.js';

export function useMe(enabled: MaybeRef<boolean> = true) {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    enabled: computed(() => !!unref(enabled)),
  });
}

export function usePublicProfile(id: MaybeRef<string>) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getPublicProfile(unref(id)),
    enabled: computed(() => !!unref(id)),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserDTO) => usersApi.updateMe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}
```

(Match real method names from `frontend/src/api/users.ts` — e.g. `getProfile`/`updateProfile` if that's what `UsersApi` exposes.)

- [ ] **Step 3: Create `frontend/src/composables/useSearch.ts`:**

```ts
import { computed, unref, type MaybeRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { searchApi } from '../api/index.js';

export function useSearch(q: MaybeRef<string>) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => searchApi.search(unref(q)),
    enabled: computed(() => unref(q).trim().length > 0),
  });
}
```

- [ ] **Step 4: Create `frontend/src/composables/useAdmin.ts`** — queries for stats/activity/lists plus mutations that invalidate the matching list. Follow the real `AdminApi` surface in `frontend/src/api/admin.ts`; pattern:

```ts
import { unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { adminApi } from '../api/index.js';

export function useAdminStats() {
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: () => adminApi.getStats() });
}

export function useAdminActivity() {
  return useQuery({ queryKey: ['admin', 'activity'], queryFn: () => adminApi.getActivity() });
}

export function useAdminUsers(page: MaybeRef<number>, search: MaybeRef<string>) {
  return useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminApi.getUsers(unref(page), 20, unref(search) || undefined),
  });
}

// Repeat the list pattern for forums/threads/posts/reports with keys
// ['admin', 'forums', page], ['admin', 'threads', page, search],
// ['admin', 'posts', page], ['admin', 'reports', page, status].

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.banUser(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// Repeat the mutation pattern for unban, role change, tier change, delete user,
// delete forum/thread/post, resolve report, badge CRUD + grant/revoke — each
// invalidates its own ['admin', <resource>] list (badge ops also ['badges']).
```

Every query/mutation the AdminDashboardView needs must exist here by the end of the step — enumerate `AdminApi`'s methods and cover them all.

- [ ] **Step 5: Typecheck + commit**

```bash
cd frontend && npm run type-check
git add frontend/src/composables
git commit -m "feat(query): likes, users, search, admin composables"
```

---

### Task 4: Convert list/detail views

**Files:**
- Modify: `frontend/src/components/Forum.vue`
- Modify: `frontend/src/views/ForumHomeView.vue`
- Modify: `frontend/src/views/ForumView.vue`
- Modify: `frontend/src/views/ThreadDetailView.vue`
- Modify: `frontend/src/views/SearchView.vue`
- Modify: `frontend/src/views/ProfileView.vue`
- Modify: `frontend/src/views/LandingHomeView.vue` (if it fetches threads/forums)

**Conversion pattern (apply per file):** delete the local `ref` + `loading` + `error` + `onMounted` fetch block, replace with the composable. Example for `Forum.vue`:

Before:
```ts
const forums = ref<ForumWithStats[]>([]);
const loading = ref(true);
onMounted(async () => {
  try {
    forums.value = await forumsApi.getAllForums();
  } finally {
    loading.value = false;
  }
});
```

After:
```ts
import { useForums } from '../composables/useForums.js';
const { data: forums, isPending: loading, error } = useForums();
```

Template changes: `forums` may now be `undefined` while loading — guard with `v-if="forums"` or default via `computed(() => forums.value ?? [])`. Keep the existing loading spinners/error messages, driven by `isPending`/`error` instead of local refs.

- [ ] **Step 1: Convert `Forum.vue`** with `useForums()`.
- [ ] **Step 2: Convert `ForumHomeView.vue`** (forums list) and `ForumView.vue` (forum + paginated threads via `useForum` + `useForumThreads`; page as a `ref` passed into the composable so page changes refetch automatically).
- [ ] **Step 3: Convert `ThreadDetailView.vue`** — `useThread(id)` + `useThreadPosts(id, page)` + `useCreatePost()` for the reply editor + `useToggleThreadLike`/`useTogglePostLike` for like buttons. Route param as `computed(() => route.params.id as string)` so navigation between threads refetches.
- [ ] **Step 4: Convert `SearchView.vue`** with `useSearch(q)` (q bound to the search input/URL param — the `enabled` guard already skips empty queries).
- [ ] **Step 5: Convert `ProfileView.vue`** with `usePublicProfile` / `useMe` + `useUpdateProfile`.
- [ ] **Step 6: Verify in dev server** — click through: landing → forum → thread → reply → like → search → profile. Data loads, reply appears after posting (invalidation refetches), like counts update.
- [ ] **Step 7: Typecheck + tests + commit**

```bash
cd frontend && npm run type-check && npm run test:unit -- --run
git add frontend/src
git commit -m "feat(query): convert list/detail views to vue-query composables"
```

---

### Task 5: Convert create/admin views

**Files:**
- Modify: `frontend/src/views/ThreadCreateView.vue`
- Modify: `frontend/src/views/ForumCreate.vue`
- Modify: `frontend/src/views/AdminDashboardView.vue`

- [ ] **Step 1: Convert `ThreadCreateView.vue`** — `useCreateThread()`; on success navigate to the new thread (`router.push`), submit button disabled on `isPending`, error shown from `mutation.error`.
- [ ] **Step 2: Convert `ForumCreate.vue`** — `useCreateForum()`, same pattern.
- [ ] **Step 3: Convert `AdminDashboardView.vue`** — swap every manual fetch for the `useAdmin` composables; every action button uses its mutation; lists refresh via invalidation (no manual re-fetch calls left).
- [ ] **Step 4: Verify in dev server** — create thread → redirected and visible; admin dashboard tabs load; ban/unban + delete actions update lists without manual refresh.
- [ ] **Step 5: Residual audit** — no view should fetch server data outside a composable anymore:

```bash
cd frontend && grep -rn "onMounted" src/views src/components --include=*.vue | grep -iE "api|fetch"
```
Expected: no hits (auth-store bootstrapping in `stores/auth.ts` is allowed — it's session state, not server-data cache).

- [ ] **Step 6: Typecheck + tests + commit**

```bash
cd frontend && npm run type-check && npm run test:unit -- --run
git add frontend/src
git commit -m "feat(query): convert create and admin views to vue-query"
```

---

### Task 6: Final QA

- [ ] **Step 1: Full click-through in the dev server**: register/login → landing → forum → create thread → reply → edit post → like → search → profile edit → admin dashboard (as admin) → logout. Watch the network tab: no duplicate bursts of identical requests (cache working), mutations followed by targeted refetches.
- [ ] **Step 2: Fix anything found, commit**

```bash
git add -A frontend/src
git commit -m "fix(query): QA fixes for vue-query adoption"
```
