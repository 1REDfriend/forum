# Manager Role — Design Spec

**Date:** 2026-07-15
**Status:** Approved
**Executor:** Sonnet 5 (implementation plan in `docs/superpowers/plans/2026-07-15-manager-role-plan.md`)

## Summary

Add a third user role, `manager`, between `user` and `admin`. A manager can create new forums and edit/delete **any** forum. A manager has **no other elevated rights**: no admin dashboard, no user management, no thread/post moderation beyond a normal user, no reports, no badges administration.

Only an admin can grant or revoke the manager role, via a 3-value role dropdown in the Admin Dashboard → Users tab (replaces the current admin↔user toggle).

## Background / Current State

- `users.role` is a plain `text` column (no enum, no CHECK constraint) defaulting to `'user'` — see `backend/src/db/schema.ts:11`. **No DB migration is required**; only application-level validation changes.
- JWT payload contains only `userId`; role is always read fresh from the DB in middleware and services. No token-staleness concern when a role changes.
- `requireAdmin` middleware (`backend/src/http/auth.ts:52`) gates `POST /forums` and all `/admin/*` routes.
- `ForumService.updateForum` / `deleteForum` allow owner-or-admin.
- **Existing bug:** the frontend shows "+ New Forum" to any authenticated user (`frontend/src/components/Forum.vue:86`, `frontend/src/views/LandingHomeView.vue:274`) while the backend rejects non-admins with 403. This spec fixes the gating.
- Forum edit/delete UI currently exists only inside the Admin Dashboard (admin-only endpoints). Managers need a non-dashboard path, so ForumView gains inline Edit/Delete controls backed by the public forum endpoints.

## Roles Matrix (after this change)

| Capability | user | manager | admin |
|---|---|---|---|
| Create forum (`POST /forums`) | ❌ | ✅ | ✅ |
| Edit any forum (`PUT /forums/:id`) | own only* | ✅ all | ✅ all |
| Delete any forum (`DELETE /forums/:id`) | own only* | ✅ all | ✅ all |
| Admin dashboard (`/admin/*` API + `/admin` page) | ❌ | ❌ | ✅ |
| Assign roles | ❌ | ❌ | ✅ |
| Thread/post moderation (pin/lock/delete others') | ❌ | ❌ | ✅ |

\* Owner-edit remains in the service policy for backward compatibility, though regular users cannot create forums, so in practice only pre-existing owners are affected.

## Design

### Backend (Hono + Drizzle, Bun runtime)

1. **`backend/src/types/index.ts`** — `UpdateUserRoleDTO`: `z.enum(['user', 'admin'])` → `z.enum(['user', 'manager', 'admin'])`.
2. **`backend/src/http/auth.ts`** — add a middleware factory:
   ```ts
   export const requireRole = (...roles: string[]) => createMiddleware<AuthEnv>(...)
   ```
   Body identical to current `requireAdmin` except the check is `roles.includes(row.role)` and the 403 message is `Forbidden: Insufficient role`. Refactor `requireAdmin = requireRole('admin')` so there is one code path. Ban check stays.
3. **`backend/src/routes/forum.routes.ts`** — `POST /` uses `requireRole('admin', 'manager')` instead of `requireAdmin`.
4. **`backend/src/domain/forum-policy.ts`** (new) — pure policy module: `FORUM_MANAGER_ROLES = ['admin', 'manager']` and `canModifyForum(userId, role, createdBy)`. Single source of truth, unit-tested like the other `domain/*` modules. `ForumService.updateForum`/`deleteForum` and the `POST /forums` guard both consume it.
5. **`backend/src/db/schema.ts`** — update the comment on `role` to `'user' | 'manager' | 'admin'`. No migration.
6. **`/admin/*` routes unchanged** — still `requireAdmin`. The self-role-change guard in `PATCH /admin/users/:id/role` stays.

### Frontend (Vue 3 + TanStack Query)

1. **Types** — widen role unions to `'user' | 'manager' | 'admin'` in `frontend/src/api/types.ts` (2 places) and `frontend/src/api/admin.ts` (`AdminUser.role`, `updateUserRole` signature).
2. **Auth store helper** — add a computed `canManageForums` (role is admin or manager) in the auth store (or a shared computed where role checks live) and use it for all gates below.
3. **Admin Dashboard Users tab** (`frontend/src/views/AdminDashboardView.vue`) — replace the click-to-toggle role badge with a `<select>` of `user | manager | admin`, wired to the existing `useUpdateUserRole` mutation. Keep the existing error alert. Style consistent with the tier dropdown already in that table. Role badge colors: admin = existing amber, manager = sky/blue, user = existing neutral.
4. **"+ New Forum" gating** — `frontend/src/components/Forum.vue:86` and `frontend/src/views/LandingHomeView.vue:274`: show only when `canManageForums` (fixes the 403 bug).
5. **ForumCreate route guard** — `/forum/create` redirects non-manager/admin users to `/forums` (client-side guard in the view or router `beforeEnter`; backend already enforces).
6. **ForumView edit/delete controls** — add Edit (inline name/description form or small modal, matching existing dashboard edit pattern) and Delete (confirm dialog) buttons in the forum header, visible when `canManageForums || forum.createdBy === currentUser.id`. Use existing `useUpdateForum` / `useDeleteForum` composables (public endpoints). On delete, navigate to `/forums`.
7. **Badges** — `frontend/src/components/ProfileCard.vue` and `frontend/src/views/ProfileView.vue`: add a `MANAGER` badge (sky/blue) alongside the existing `ADMIN` (amber) badge pattern.
8. **UserDropdown** — Admin Dashboard link stays admin-only. No manager entry point to `/admin`.

### Error handling

- Backend returns existing error shapes: 401 unauthenticated, 403 `Forbidden: Insufficient role` (middleware) or `ForbiddenError` (service). No new error types.
- Frontend surfaces mutation errors via the existing `errorMessage()` helper/alert patterns.

## Testing

Existing backend tests are unit-level (`bun test`); there are no route tests. Verification for this change:

1. **Backend unit test** (new, `bun test`): role-policy check for `ForumService.updateForum`/`deleteForum` — manager allowed on non-owned forum, user forbidden, admin allowed. Mock repositories following existing test style (`share.service.test.ts`).
2. **Typecheck both packages**: `bun run typecheck` (backend), `npm run type-check` (frontend).
3. **Manual API smoke** (dev server): manager token → `POST /forums` 201, `PUT/DELETE /forums/:id` on non-owned forum 200/204, `GET /admin/stats` 403; user token → `POST /forums` 403.
4. **UI smoke**: role dropdown changes user→manager; manager sees "+ New Forum" and ForumView edit/delete; manager has no Admin link; user sees none of these.

## Out of Scope

- Any thread/post moderation powers for manager.
- Per-forum manager assignment (manager scope is global).
- DB enum/CHECK constraint on `role`.
- Changes to tier/score/badge systems.
