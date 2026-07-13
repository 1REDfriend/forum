# White Theme + Hono Migration + TanStack Query — Design

**Date:** 2026-07-13
**Status:** Approved by user

## Goal

Three coordinated changes to the forum:

1. **Frontend reskin** — white/light theme matching creasy.club / photo.creasy.club (shadcn-style), with dark-mode toggle.
2. **Backend migration** — Elysia → Hono (big-bang swap), TypeBox DTOs → Zod.
3. **Frontend data layer** — adopt `@tanstack/vue-query` for all API calls (Vue 3 stays; no React rewrite).

## Sequencing (Approach A: phased-independent)

- **Phase 1a** (frontend reskin) and **Phase 1b** (backend Hono) run in parallel — zero file overlap, zero conflict risk.
- **Phase 2** (TanStack Query) starts only after Phase 1a lands, because both touch the same `.vue` files.

## Reference-site design tokens (measured live from both sites, 2026-07-13)

Both sites are shadcn/ui "new-york" style, light default:

| Token | Value |
|---|---|
| `--background` | `oklch(100% 0 0)` (pure white) |
| `--foreground` | `oklch(15.3% .006 107.1)` (near-black) |
| `--primary` (accent, per user choice: photo.creasy.club orange) | `oklch(55.3% .195 38.402)` |
| `--secondary` | `oklch(96.7% .001 286.375)` |
| `--muted` | `oklch(96.6% .005 106.5)` |
| `--muted-foreground` | `oklch(55.6% 0 0)` |
| `--border` / `--input` | `oklch(93% .007 106.5)` |
| `--destructive` | `oklch(57.7% .245 27.325)` |
| `--radius` | `0.625rem` |
| Font | `"Inter Variable", "IBM Plex Sans Thai", sans-serif` |

## Phase 1a — Frontend white-theme reskin

### Scope

- Continue from the in-progress uncommitted edits already in the working tree (`frontend/src/assets/base.css`, `Forum.vue`, `Navbar.vue`, `UserDropdown.vue`, `LandingHomeView.vue`, `LoginView.vue`, `RegisterView.vue`, `SearchView.vue`) — build on them, don't restart.
- Extend the reskin to **all** remaining views and components: `AdminDashboardView`, `ForgotPasswordView`, `ForumCreate`, `ForumHomeView`, `ForumView`, `NotFoundView`, `ProfileView`, `ResetPasswordView`, `ThreadCreateView`, `ThreadDetailView`, plus `ForumItem`, `MarkdownEditor`, `MarkdownRenderer`, `ProfileCard`, `ReportButton`, `ShareButton`, and anything under `components/animations` and `components/icons` that hardcodes dark colors.

### Theme mechanism

- Redefine `frontend/src/assets/base.css` around a **light/dark CSS-variable pair** (shadcn convention): `:root { … light values … }` and `.dark { … dark values … }`.
- Light values = the token table above. Dark values = derived dark equivalents of the same palette (near-black background, light foreground, same orange primary).
- The existing glass-morphism tokens (`--glass-*`) get light-theme values in `:root` and keep dark-appropriate values under `.dark`; component styles keep consuming the same var names so most components need only spot fixes for hardcoded colors.
- `.dark` class lives on `<html>`.

### Toggle behavior (matches creasy.club)

- Toggle button in `Navbar.vue` (sun/moon icon).
- Light is default. Initial theme: `localStorage('theme')` if set, else `prefers-color-scheme`, else light.
- Choice persisted to `localStorage`. Inline `<script>` in `index.html` applies the class before first paint (no flash of wrong theme).
- Theme state exposed via the existing `stores/ui.ts` Pinia store.

### Fonts

- Add `@fontsource-variable/inter` and `@fontsource/ibm-plex-sans-thai` npm packages (self-hosted, no CDN request).
- `--font-sans: "Inter Variable", "IBM Plex Sans Thai", sans-serif;` — Inter covers Latin, Plex covers Thai.

### Layout

- Align layout patterns with the reference sites where the forum diverges: clean white cards with `--border` hairlines instead of heavy glass panels, `0.625rem` radius, generous whitespace, minimal shadows (`shadow-sm`-scale). The page structure (navbar / content / footer) stays; this is a restyle, not an IA change.

## Phase 1b — Backend Elysia → Hono (big-bang)

### Constraints

- **API contract stays byte-identical**: same URLs, methods, request/response shapes, status codes, and the `{ error: "..." }` error envelope. Frontend requires zero changes for this phase.
- Runtime stays **Bun** (`Bun.serve` via Hono's Bun adapter). Drizzle, cuid2, and the entire `services/` / `repositories/` / `domain/` layers are untouched — only the HTTP framework layer changes.
- Existing deploy path (backend Dockerfile CMD with migrate-on-restart) unchanged.

### Dependency swap

| Out | In |
|---|---|
| `elysia` | `hono` |
| `@elysiajs/cors` | `hono/cors` (built-in) |
| `@elysiajs/static` | `hono/bun` `serveStatic` |
| `@elysiajs/openapi` | dropped — see note below |
| Elysia `t` (TypeBox) | `zod` + `@hono/zod-validator` |

> **OpenAPI note:** The docs page was dev-only (production already disables it). Porting it would require `@hono/zod-openapi`'s `createRoute()` style on every route, roughly doubling migration churn for a dev convenience — so this migration drops the docs page. Re-adding docs is a possible follow-up.

### Structure

- `src/index.ts`: Hono app with the **same middleware chain order**: security headers → CORS (same comma-separated `FRONTEND_URL` origin logic) → openapi (non-prod) → static `/uploads` (with `cross-origin-resource-policy: cross-origin`) → global rate limit → routes → central error handler.
- Each of the 13 route files (`auth`, `forum`, `thread`, `post`, `user`, `search`, `like`, `upload`, `attachment`, `admin`, `report`, `share`, `badge`) becomes a Hono sub-app mounted at its existing prefix. Handlers remain thin wrappers over the existing services.
- `src/http/auth.ts` (`verifyBearer` + auth/optional-auth guards), `src/http/security.ts`, `src/http/rateLimit.ts` re-expressed as Hono middleware; the per-route rate limiters (`loginRateLimit` etc.) keep their limits and keys.
- `src/types/index.ts`: every DTO rewritten TypeBox → Zod. Types derived with `z.infer<>` keep the same exported names so services compile unchanged.
- Body size limit (16 MB) enforced via Hono's `bodyLimit` middleware.

### Error handling

Hono `app.onError` + `app.notFound` replicate today's contract exactly:

- `AppError` → its `statusCode`, `{ error: message }`
- Zod validation failure → 400 `{ error: "Validation Error" }`, plus `details` only when `NODE_ENV !== 'production'`
- Unknown route → 404 `{ error: "Resource not found" }`
- Anything else → logged via `utils/logger`, 500 `{ error: "Internal Server Error" }`

## Phase 2 — TanStack Query (after 1a lands)

### Scope

- Add `@tanstack/vue-query`. Single `QueryClient` registered in `main.ts` via `VueQueryPlugin`.
- New `frontend/src/composables/` directory: one composable module per API domain wrapping the existing `frontend/src/api/*` functions — e.g. `useForums`, `useThreads`, `usePosts`, `useAuth`-adjacent queries, `useSearch`, `useLikes`, `useAdmin`, `useReports`, `useUsers`. The `api/` modules themselves stay as the raw fetch layer.
- Views and components swap manual `ref`/`loading`/`error`/`onMounted` fetch state for `useQuery` / `useMutation` results. Mutations invalidate the relevant query keys (e.g. creating a post invalidates its thread's posts query).
- Query keys: hierarchical arrays — `['forums']`, `['forum', id]`, `['thread', id, 'posts']`, etc.
- Sensible defaults: `staleTime` ~30 s for list data, retry 1. No optimistic updates in this pass (YAGNI).
- Pinia keeps auth/session and UI state (`stores/auth.ts`, `stores/ui.ts`); server data moves to Query cache. No SSR.

### Error handling

Same user-facing UX as today — components read `error` from the query/mutation result instead of a local ref. The api layer's error-shape handling (`{ error: "..." }`) is unchanged.

## Testing & verification

- **Backend:** the 6 existing unit tests (`domain/`, `services/`, `db/ids`) don't touch HTTP and must keep passing untouched. No route-level tests exist to port; migration verified by a manual smoke pass over every route group (health, auth register/login/refresh, forum/thread/post CRUD, search, likes, upload part/complete/abort, attachments, admin, reports, share, badges) plus `bun run typecheck`.
- **Frontend:** the 4 existing specs must keep passing. Theme verified visually per view in both light and dark via the dev server (browser tool click-through). TanStack phase verified by click-through of each converted view: data loads, mutations work, cache invalidation refreshes lists.
- Each phase is its own commit series; Phase 1a and 1b can merge in either order.

## Out of scope

- No React / TanStack Router / TanStack Start rewrite — Vue 3 stays (user decision).
- No IA/navigation restructure — restyle only.
- No new test suites beyond keeping existing ones green.
- No optimistic updates or SSR in the TanStack pass.
