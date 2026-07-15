# Manager Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `manager` role that can create forums and edit/delete any forum, granted by admins via a 3-value role dropdown, with no other elevated rights.

**Architecture:** Role stays a plain text column on `users` (no migration). A pure domain policy module (`forum-policy.ts`) is the single source of truth for who may create/modify forums; a generic `requireRole(...)` middleware factory replaces the hard-coded admin check on forum creation. Frontend widens role unions, gates forum-management UI behind an auth-store computed, and adds inline forum edit/delete controls to ForumView (managers do not get the admin dashboard).

**Tech Stack:** Backend: Hono + Drizzle + Zod on Bun (`bun test`, `bun run typecheck`). Frontend: Vue 3 + Pinia + TanStack Query (`npm run type-check`).

**Spec:** `docs/superpowers/specs/2026-07-15-manager-role-design.md`

**Working directory note:** backend commands run in `backend/`, frontend commands in `frontend/`. Git commands run from repo root.

---

### Task 1: Forum policy domain module (backend, TDD)

**Files:**
- Create: `backend/src/domain/forum-policy.ts`
- Test: `backend/src/domain/forum-policy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/domain/forum-policy.test.ts`:

```ts
import { test, expect } from 'bun:test';
import { FORUM_MANAGER_ROLES, canModifyForum } from './forum-policy.js';

test('manager roles list contains exactly admin and manager', () => {
  expect([...FORUM_MANAGER_ROLES].sort()).toEqual(['admin', 'manager']);
});

test('admin can modify any forum', () => {
  expect(canModifyForum('u1', 'admin', 'someone-else')).toBe(true);
});

test('manager can modify any forum', () => {
  expect(canModifyForum('u1', 'manager', 'someone-else')).toBe(true);
});

test('owner can modify their own forum regardless of role', () => {
  expect(canModifyForum('u1', 'user', 'u1')).toBe(true);
});

test('regular user cannot modify a forum they do not own', () => {
  expect(canModifyForum('u1', 'user', 'someone-else')).toBe(false);
});

test('missing role cannot modify a forum they do not own', () => {
  expect(canModifyForum('u1', undefined, 'someone-else')).toBe(false);
});

test('null createdBy is not treated as owned', () => {
  expect(canModifyForum('u1', 'user', null)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (in `backend/`): `bun test src/domain/forum-policy.test.ts`
Expected: FAIL — cannot resolve `./forum-policy.js`

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/domain/forum-policy.ts`:

```ts
/** Roles allowed to create forums and edit/delete ANY forum. */
export const FORUM_MANAGER_ROLES = ['admin', 'manager'] as const;

/** Owner may modify their own forum; admin/manager may modify any forum. */
export function canModifyForum(
  userId: string,
  role: string | undefined,
  createdBy: string | null,
): boolean {
  if (createdBy !== null && createdBy === userId) return true;
  return role !== undefined && (FORUM_MANAGER_ROLES as readonly string[]).includes(role);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (in `backend/`): `bun test src/domain/forum-policy.test.ts`
Expected: 7 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/forum-policy.ts backend/src/domain/forum-policy.test.ts
git commit -m "feat(roles): add forum-policy domain module for manager role"
```

---

### Task 2: `requireRole` middleware factory + route/DTO wiring (backend)

**Files:**
- Modify: `backend/src/http/auth.ts:51-69` (replace `requireAdmin` with factory)
- Modify: `backend/src/routes/forum.routes.ts` (POST guard)
- Modify: `backend/src/types/index.ts:102-104` (role enum)
- Modify: `backend/src/db/schema.ts:11` (comment only)

- [ ] **Step 1: Replace `requireAdmin` with a `requireRole` factory in `backend/src/http/auth.ts`**

Replace the whole block at lines 51-69:

```ts
/** Require an authenticated admin (DB role check); sets `user: JwtPayload`. */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const user = verifyBearer(c.req.header('authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const row = await userRepository.findById(user.userId);
  if (!row || row.role !== 'admin') return c.json({ error: 'Forbidden: Admin access required' }, 403);
  if (row.isBanned) {
    return c.json(
      {
        error: 'Account banned',
        reason: row.banReason || 'No reason provided',
        bannedAt: row.bannedAt,
      },
      403,
    );
  }
  c.set('user', user);
  await next();
});
```

with:

```ts
/** Require an authenticated user whose DB role is one of `roles`; sets `user: JwtPayload`. */
export const requireRole = (...roles: string[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = verifyBearer(c.req.header('authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const row = await userRepository.findById(user.userId);
    if (!row || !roles.includes(row.role))
      return c.json({ error: 'Forbidden: Insufficient role' }, 403);
    if (row.isBanned) {
      return c.json(
        {
          error: 'Account banned',
          reason: row.banReason || 'No reason provided',
          bannedAt: row.bannedAt,
        },
        403,
      );
    }
    c.set('user', user);
    await next();
  });

/** Require an authenticated admin (DB role check); sets `user: JwtPayload`. */
export const requireAdmin = requireRole('admin');
```

- [ ] **Step 2: Gate forum creation to admin+manager in `backend/src/routes/forum.routes.ts`**

Change the import (line 3):

```ts
import { requireAuth, requireRole, type OptionalAuthEnv } from '../http/auth.js';
```

Add below the existing imports (after line 6):

```ts
import { FORUM_MANAGER_ROLES } from '../domain/forum-policy.js';
```

Change the POST route (line 11):

```ts
  .post('/', requireRole(...FORUM_MANAGER_ROLES), validate('json', CreateForumDTO), async (c) =>
```

Note: `requireAdmin` is no longer imported here — remove it from the import if the typechecker flags it as unused.

- [ ] **Step 3: Widen the role DTO in `backend/src/types/index.ts`**

Change line 103:

```ts
export const UpdateUserRoleDTO = z.object({
  role: z.enum(['user', 'manager', 'admin']),
});
```

- [ ] **Step 4: Update the schema comment in `backend/src/db/schema.ts` (line 11)**

```ts
  role: text("role").notNull().default("user"), // 'user' | 'manager' | 'admin' — set by admin
```

No migration: plain text column, no constraint.

- [ ] **Step 5: Typecheck and run backend tests**

Run (in `backend/`): `bun run typecheck && bun test src/`
Expected: typecheck clean; all tests pass. (Scope `bun test` to `src/` so it does not pick up node_modules tests.)

- [ ] **Step 6: Commit**

```bash
git add backend/src/http/auth.ts backend/src/routes/forum.routes.ts backend/src/types/index.ts backend/src/db/schema.ts
git commit -m "feat(roles): requireRole middleware; manager can create forums"
```

---

### Task 3: Forum service uses the policy (backend)

**Files:**
- Modify: `backend/src/services/forum.service.ts:27-58`

- [ ] **Step 1: Use `canModifyForum` in updateForum/deleteForum**

Add to the imports at the top of `backend/src/services/forum.service.ts`:

```ts
import { canModifyForum } from '../domain/forum-policy.js';
```

In `updateForum`, replace:

```ts
    // Check ownership or admin
    const user = await userRepository.findById(userId);
    if (forum.createdBy !== userId && user?.role !== 'admin') {
      throw ForbiddenError('You do not have permission to edit this forum');
    }
```

with:

```ts
    // Owner, or a forum-manager role (admin/manager)
    const user = await userRepository.findById(userId);
    if (!canModifyForum(userId, user?.role, forum.createdBy)) {
      throw ForbiddenError('You do not have permission to edit this forum');
    }
```

In `deleteForum`, replace:

```ts
    const user = await userRepository.findById(userId);
    if (forum.createdBy !== userId && user?.role !== 'admin') {
      throw ForbiddenError('You do not have permission to delete this forum');
    }
```

with:

```ts
    const user = await userRepository.findById(userId);
    if (!canModifyForum(userId, user?.role, forum.createdBy)) {
      throw ForbiddenError('You do not have permission to delete this forum');
    }
```

- [ ] **Step 2: Typecheck and test**

Run (in `backend/`): `bun run typecheck && bun test src/`
Expected: clean / all pass

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/forum.service.ts
git commit -m "feat(roles): manager can edit/delete any forum"
```

---

### Task 4: Frontend role type widening

**Files:**
- Modify: `frontend/src/api/types.ts:11,26`
- Modify: `frontend/src/api/admin.ts:19,131`
- Modify: `frontend/src/composables/useAdmin.ts:104`

- [ ] **Step 1: Widen unions**

`frontend/src/api/types.ts` line 11 (interface `User`):

```ts
  role: 'user' | 'manager' | 'admin';
```

`frontend/src/api/types.ts` line 26 (interface `PostAuthor`):

```ts
  role: 'user' | 'manager' | 'admin';
```

`frontend/src/api/admin.ts` line 19 (interface `AdminUser`):

```ts
  role: 'user' | 'manager' | 'admin';
```

`frontend/src/api/admin.ts` line 131 (method `updateUserRole`):

```ts
  updateUserRole(id: string, role: 'user' | 'manager' | 'admin'): Promise<AdminUser> {
```

`frontend/src/composables/useAdmin.ts` line 104 (mutation arg type):

```ts
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'manager' | 'admin' }) =>
```

- [ ] **Step 2: Typecheck**

Run (in `frontend/`): `npm run type-check`
Expected: clean. (If `AdminDashboardView.vue` errors on `toggleUserRole` assigning a narrowed union — that function is replaced in Task 6; if the error appears now, proceed to Task 6 first, then run type-check for both together, but keep the commits separate.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/types.ts frontend/src/api/admin.ts frontend/src/composables/useAdmin.ts
git commit -m "feat(roles): widen frontend role unions to include manager"
```

---

### Task 5: Auth-store gate + "+ New Forum" gating + ForumCreate guard

**Files:**
- Modify: `frontend/src/stores/auth.ts`
- Modify: `frontend/src/components/Forum.vue:86`
- Modify: `frontend/src/views/LandingHomeView.vue:274`
- Modify: `frontend/src/views/ForumCreate.vue`

- [ ] **Step 1: Add `canManageForums` computed to `frontend/src/stores/auth.ts`**

After line 24 (`const isAuthenticated = ...`) add:

```ts
  // Forum management (create / edit any / delete any) — admin and manager roles.
  const canManageForums = computed(
    () => user.value?.role === 'admin' || user.value?.role === 'manager',
  );
```

And add `canManageForums,` to the returned object (after `isAuthenticated,`):

```ts
  return {
    user,
    token,
    isAuthenticated,
    canManageForums,
    login,
    register,
    googleAuth,
    fetchCurrentUser,
    logout,
    handleUnauthorized,
  };
```

- [ ] **Step 2: Gate the "+ New Forum" button in `frontend/src/components/Forum.vue` (line 86)**

Change:

```html
          <router-link v-if="authStore.isAuthenticated" to="/forum/create"
```

to:

```html
          <router-link v-if="authStore.canManageForums" to="/forum/create"
```

- [ ] **Step 3: Gate the empty-state create link in `frontend/src/views/LandingHomeView.vue` (line 274)**

Change:

```html
          <router-link v-if="authStore.isAuthenticated" to="/forum/create" class="btn-primary" style="margin-top:16px">
```

to:

```html
          <router-link v-if="authStore.canManageForums" to="/forum/create" class="btn-primary" style="margin-top:16px">
```

(This fixes the pre-existing bug where any logged-in user saw the button and then got a 403 from the backend.)

- [ ] **Step 4: Guard `frontend/src/views/ForumCreate.vue`**

In the `<script setup>` block, add the import and redirect. After line 4 (`import { useCreateForum } ...`):

```ts
import { useAuthStore } from '../stores/auth.js';
```

After line 6 (`const router = useRouter();`):

```ts
const authStore = useAuthStore();
// Backend enforces this too (403); redirect non-managers away from the form.
if (!authStore.canManageForums) {
  router.replace('/forums');
}
```

- [ ] **Step 5: Typecheck**

Run (in `frontend/`): `npm run type-check`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/auth.ts frontend/src/components/Forum.vue frontend/src/views/LandingHomeView.vue frontend/src/views/ForumCreate.vue
git commit -m "feat(roles): gate forum creation UI to admin/manager"
```

---

### Task 6: Admin dashboard 3-value role dropdown

**Files:**
- Modify: `frontend/src/views/AdminDashboardView.vue:290-297` (script) and `:562-568` (template)

- [ ] **Step 1: Replace the toggle handler in the script section**

Replace lines 290-297:

```ts
const updateUserRoleMutation = useUpdateUserRole();
const toggleUserRole = (user: AdminUser) => {
  const newRole = user.role === 'admin' ? 'user' : 'admin';
  updateUserRoleMutation.mutate(
    { id: user.id, role: newRole },
    { onError: (err: unknown) => alert(errorMessage(err) || 'Failed to update role') },
  );
};
```

with:

```ts
const updateUserRoleMutation = useUpdateUserRole();
const setUserRole = (user: AdminUser, role: 'user' | 'manager' | 'admin') => {
  if (role === user.role) return;
  updateUserRoleMutation.mutate(
    { id: user.id, role },
    { onError: (err: unknown) => alert(errorMessage(err) || 'Failed to update role') },
  );
};
```

- [ ] **Step 2: Replace the role badge button with a select in the template**

Replace lines 562-568:

```html
                <td>
                  <button
                    @click="toggleUserRole(user)"
                    :class="['role-badge', user.role === 'admin' ? 'role-admin' : 'role-user']"
                    :title="`Click to ${user.role === 'admin' ? 'demote to user' : 'promote to admin'}`"
                  >{{ user.role }}</button>
                </td>
```

with (reuses the existing `tier-select` styling used by the tier dropdown in the same row):

```html
                <td>
                  <select
                    :value="user.role"
                    @change="setUserRole(user, ($event.target as HTMLSelectElement).value as 'user' | 'manager' | 'admin')"
                    class="tier-select"
                    title="Set role"
                  >
                    <option value="user">user</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
```

Leave the now-unused `.role-badge` / `.role-admin` / `.role-user` CSS in place only if it is still referenced elsewhere in the file; if `role-badge` has no remaining template usage in this file, delete those CSS rules from the `<style>` block.

- [ ] **Step 3: Typecheck**

Run (in `frontend/`): `npm run type-check`
Expected: clean (this also clears any Task 4 pending union error)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/AdminDashboardView.vue
git commit -m "feat(roles): 3-value role dropdown in admin users tab"
```

---

### Task 7: ForumView inline edit/delete controls

**Files:**
- Modify: `frontend/src/views/ForumView.vue` (script + header template)

- [ ] **Step 1: Add script logic**

In `frontend/src/views/ForumView.vue`, change line 6 to also import the mutations:

```ts
import { useForum, useUpdateForum, useDeleteForum } from '../composables/useForums.js';
```

Add a new import line after line 2 (`vue-router` is not yet imported in this file):

```ts
import { useRouter } from 'vue-router';
```

After line 14 (`const forumId = computed(...)`) add:

```ts
const router = useRouter();

// Owner, admin, or manager may edit/delete this forum (backend enforces the same policy).
const canManageForum = computed(
  () =>
    authStore.canManageForums ||
    (!!authStore.user && !!forumData.value && forumData.value.createdBy === authStore.user.id),
);

const isEditingForum = ref(false);
const editName = ref('');
const editDescription = ref('');
const { mutate: updateForumMutate, isPending: isSavingForum } = useUpdateForum();
const { mutate: deleteForumMutate, isPending: isDeletingForum } = useDeleteForum();

const startEditForum = () => {
  if (!forumData.value) return;
  editName.value = forumData.value.name;
  editDescription.value = forumData.value.description ?? '';
  isEditingForum.value = true;
};

const saveForumEdit = () => {
  if (!forumData.value || !editName.value.trim()) return;
  updateForumMutate(
    { id: forumData.value.id, data: { name: editName.value.trim(), description: editDescription.value } },
    {
      onSuccess: () => { isEditingForum.value = false; },
      onError: (err: unknown) => alert(err instanceof Error ? err.message : 'Failed to update forum'),
    },
  );
};

const confirmDeleteForum = () => {
  if (!forumData.value) return;
  if (!confirm(`Delete forum "${forumData.value.name}"? All threads and posts in it will be permanently removed.`)) return;
  deleteForumMutate(forumData.value.id, {
    onSuccess: () => router.push('/forums'),
    onError: (err: unknown) => alert(err instanceof Error ? err.message : 'Failed to delete forum'),
  });
};
```

Note: `canManageForum` references `forumData`, which is declared on line 20 — move this whole added block to AFTER line 21 (after the `useForumThreads` destructure) so `forumData` exists. Final order in the script: props → authStore/forumId → pagination refs → `useForum`/`useForumThreads` destructures → this new block → the rest.

- [ ] **Step 2: Update the header template**

Replace the header block (lines 111-128):

```html
      <!-- Header -->
      <div class="flex justify-between items-start pb-6 gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-extrabold text-(--color-heading)" v-if="forumData">{{ forumData.name }}</h1>
          <h1 class="text-2xl font-extrabold text-(--color-heading)" v-else>Loading...</h1>
          <p class="text-(--color-text-muted) mt-1 text-sm" v-if="forumData?.description">{{ forumData.description }}</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <button v-if="anyUnread" @click="markAllThreadsRead"
            class="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium border border-sky-500/30 hover:border-sky-500/50 px-3 py-1.5 rounded-full transition-colors">
            ✓ Mark All Read
          </button>
          <router-link v-if="authStore.isAuthenticated && forumData" :to="`/forum/${forumData.id}/create-thread`"
            class="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-full shadow-sm text-sm font-medium transition-colors whitespace-nowrap">
            + New Thread
          </router-link>
        </div>
      </div>
```

with:

```html
      <!-- Header -->
      <div class="flex justify-between items-start pb-6 gap-4 flex-wrap">
        <div class="min-w-0 flex-1">
          <template v-if="!isEditingForum">
            <h1 class="text-2xl font-extrabold text-(--color-heading)" v-if="forumData">{{ forumData.name }}</h1>
            <h1 class="text-2xl font-extrabold text-(--color-heading)" v-else>Loading...</h1>
            <p class="text-(--color-text-muted) mt-1 text-sm" v-if="forumData?.description">{{ forumData.description }}</p>
          </template>
          <!-- Inline forum edit form (owner / manager / admin) -->
          <div v-else class="space-y-2 max-w-xl">
            <input v-model="editName" type="text" placeholder="Forum name"
              class="block w-full px-3 py-2 border border-(--color-border) bg-(--color-background) text-(--color-heading) rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <textarea v-model="editDescription" rows="2" placeholder="Description (optional)"
              class="block w-full px-3 py-2 border border-(--color-border) bg-(--color-background) text-(--color-heading) rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            <div class="flex gap-2">
              <button @click="saveForumEdit" :disabled="isSavingForum || !editName.trim()"
                class="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50">
                {{ isSavingForum ? 'Saving...' : 'Save' }}
              </button>
              <button @click="isEditingForum = false"
                class="border border-(--color-border) text-(--color-heading) px-4 py-1.5 rounded-full text-sm font-medium hover:bg-(--color-background-mute) transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <button v-if="anyUnread" @click="markAllThreadsRead"
            class="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium border border-sky-500/30 hover:border-sky-500/50 px-3 py-1.5 rounded-full transition-colors">
            ✓ Mark All Read
          </button>
          <button v-if="canManageForum && forumData && !isEditingForum" @click="startEditForum" title="Edit forum"
            class="text-xs text-(--color-text-muted) hover:text-(--color-heading) font-medium border border-(--color-border) hover:border-(--color-text-muted) px-3 py-1.5 rounded-full transition-colors">
            ✏️ Edit
          </button>
          <button v-if="canManageForum && forumData" @click="confirmDeleteForum" :disabled="isDeletingForum" title="Delete forum"
            class="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium border border-red-500/30 hover:border-red-500/50 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50">
            {{ isDeletingForum ? 'Deleting...' : '🗑 Delete' }}
          </button>
          <router-link v-if="authStore.isAuthenticated && forumData" :to="`/forum/${forumData.id}/create-thread`"
            class="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-full shadow-sm text-sm font-medium transition-colors whitespace-nowrap">
            + New Thread
          </router-link>
        </div>
      </div>
```

- [ ] **Step 3: Typecheck**

Run (in `frontend/`): `npm run type-check`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ForumView.vue
git commit -m "feat(roles): inline forum edit/delete controls on ForumView"
```

---

### Task 8: MANAGER badges

**Files:**
- Modify: `frontend/src/components/ProfileCard.vue:40`
- Modify: `frontend/src/views/ProfileView.vue:277-280`

- [ ] **Step 1: ProfileCard badge**

In `frontend/src/components/ProfileCard.vue`, after line 40 (the ADMIN span), add:

```html
        <span v-else-if="author.role === 'manager'" class="pcard-badge pcard-role text-sky-700 dark:text-sky-300">MANAGER</span>
```

- [ ] **Step 2: ProfileView badge**

In `frontend/src/views/ProfileView.vue`, after the Admin span (lines 277-280), add:

```html
                            <span v-else-if="profileUser.role === 'manager'"
                                class="bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded-full font-bold text-xs uppercase">
                                Manager
                            </span>
```

- [ ] **Step 3: Typecheck**

Run (in `frontend/`): `npm run type-check`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProfileCard.vue frontend/src/views/ProfileView.vue
git commit -m "feat(roles): manager badge on profile card and profile view"
```

---

### Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Backend checks**

Run (in `backend/`): `bun run typecheck && bun test src/`
Expected: clean / all pass

- [ ] **Step 2: Frontend checks**

Run (in `frontend/`): `npm run type-check`
Expected: clean

- [ ] **Step 3: Manual API smoke (requires dev DB + backend running: `bun run dev` in `backend/`)**

Setup: create two users; promote one to `manager` (as an admin):

```bash
# as admin (replace $ADMIN_TOKEN, $MANAGER_USER_ID)
curl -s -X PATCH http://localhost:3000/api/admin/users/$MANAGER_USER_ID/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"manager"}'
```

(Adjust the base path to match the server's mount — check `backend/src/index.ts` for whether routes are under `/api`.)

Then verify, with `$MANAGER_TOKEN` (login as the manager AFTER promotion is not required — role is read from DB per request):

| Call | Expected |
|---|---|
| `POST /forums` `{"name":"mgr forum"}` with `$MANAGER_TOKEN` | 201 |
| `PUT /forums/<id-of-forum-created-by-someone-else>` `{"name":"renamed"}` with `$MANAGER_TOKEN` | 200 |
| `DELETE /forums/<that-id>` with `$MANAGER_TOKEN` | 204 |
| `GET /admin/stats` with `$MANAGER_TOKEN` | 403 |
| `POST /forums` with a plain user token | 403 `Forbidden: Insufficient role` |
| `PATCH /admin/users/<id>/role` `{"role":"manager"}` with a plain user token | 403 |

- [ ] **Step 4: UI smoke (run `npm run dev` in `frontend/`)**

1. As admin → `/admin` → Users tab: role dropdown shows user/manager/admin; set a user to `manager`.
2. As that manager (re-login or reload so `/me` refreshes the cached role): `/forums` shows "+ New Forum"; can create a forum; ForumView of ANY forum shows ✏️ Edit and 🗑 Delete; edit saves; delete confirms and navigates to `/forums`; UserDropdown has NO Admin Dashboard link; navigating to `/forum/create` works.
3. As a plain user: no "+ New Forum" anywhere; `/forum/create` redirects to `/forums`; no edit/delete on ForumView.
4. Manager's profile page and post profile cards show the MANAGER badge (sky/blue).

- [ ] **Step 5: Final commit if any fixes were made during verification**

```bash
git add -A
git commit -m "fix(roles): verification fixes for manager role"
```

(Skip if the working tree is clean.)
