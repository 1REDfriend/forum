# Backend Elysia → Hono Migration (Phase 1b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Elysia with Hono across the backend HTTP layer, and TypeBox DTOs with Zod, keeping the API contract byte-identical so the frontend needs zero changes.

**Architecture:** Only the HTTP framework layer changes: `src/index.ts`, `src/http/*`, `src/routes/*`, `src/types/index.ts`. Services, repositories, domain, db, config, utils are untouched. Runtime stays Bun (`Bun.serve` with `fetch: app.fetch`). Each route file becomes a Hono sub-app mounted at its existing prefix. Handlers stay thin wrappers over the existing services.

**Tech Stack:** Bun, Hono, Zod v4, `@hono/zod-validator`, Drizzle (unchanged), jsonwebtoken (unchanged).

**Spec:** `docs/superpowers/specs/2026-07-13-white-theme-hono-tanstack-design.md`

**Spec deviation (flagged for user):** The spec listed `@hono/zod-openapi` for the dev-only OpenAPI docs page. That library requires rewriting every route in `createRoute()` style — roughly doubling migration churn for a page that production already disables. This plan **drops the OpenAPI docs page** instead. If docs are wanted later, add them as a follow-up.

**Contract invariants (verify in every task):**
- Same URLs, methods, status codes, and JSON shapes.
- Error envelope is always `{ "error": "..." }` (plus `reason`/`bannedAt` on ban 403s, `details` on non-prod validation errors).
- 204 responses have empty bodies. `/share/*` returns `text/html`.
- `cross-origin-resource-policy: cross-origin` on all responses including static uploads.
- Max request body 16 MB (same as today's Elysia `serve.maxRequestBodySize`).

---

### Task 1: Dependencies + Zod DTOs

**Files:**
- Modify: `backend/package.json` (via bun add/remove)
- Modify: `backend/src/types/index.ts` (full replace)

- [ ] **Step 1: Swap dependencies**

```bash
cd backend && bun remove elysia @elysiajs/cors @elysiajs/openapi @elysiajs/static && bun add hono zod @hono/zod-validator
```

- [ ] **Step 2: Replace `backend/src/types/index.ts` entirely with the Zod version.** Every schema keeps its exported name; every type keeps its exported name (now via `z.infer`), so services compile unchanged.

```ts
import { z } from 'zod';
import { TIERS as TIER_DEFS } from '../domain/tiers.js';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const RegisterDTO = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  password: z.string().min(8).max(100),
});
export type RegisterDTO = z.infer<typeof RegisterDTO>;

export const LoginDTO = z.object({
  email: z.string().email().max(254),
  password: z.string().max(100),
});
export type LoginDTO = z.infer<typeof LoginDTO>;

export const GoogleAuthDTO = z.object({
  idToken: z.string(),
});
export type GoogleAuthDTO = z.infer<typeof GoogleAuthDTO>;

export const ForgotPasswordDTO = z.object({
  email: z.string().email().max(254),
});
export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordDTO>;

export const ResetPasswordDTO = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});
export type ResetPasswordDTO = z.infer<typeof ResetPasswordDTO>;

export const RefreshDTO = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDTO = z.infer<typeof RefreshDTO>;

export const LogoutDTO = z.object({
  refreshToken: z.string().optional(),
});
export type LogoutDTO = z.infer<typeof LogoutDTO>;

// ─── Forums ───────────────────────────────────────────────────────────────────
export const CreateForumDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export type CreateForumDTO = z.infer<typeof CreateForumDTO>;

// "At least one field" is enforced in the route handler (same as before).
export const UpdateForumDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});
export type UpdateForumDTO = z.infer<typeof UpdateForumDTO>;

// ─── Threads ──────────────────────────────────────────────────────────────────
export const CreateThreadDTO = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  forumId: z.string().min(1),
});
export type CreateThreadDTO = z.infer<typeof CreateThreadDTO>;

export const UpdateThreadDTO = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
});
export type UpdateThreadDTO = z.infer<typeof UpdateThreadDTO>;

// ─── Posts ────────────────────────────────────────────────────────────────────
export const CreatePostDTO = z.object({
  content: z.string().min(1).max(50000),
  threadId: z.string().min(1),
});
export type CreatePostDTO = z.infer<typeof CreatePostDTO>;

export const UpdatePostDTO = z.object({
  content: z.string().min(1).max(50000),
});
export type UpdatePostDTO = z.infer<typeof UpdatePostDTO>;

// ─── Users ────────────────────────────────────────────────────────────────────
export const UpdateUserDTO = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().max(2000).optional(),
  banner: z.string().max(2000).optional(),
  bio: z.string().max(500).optional(),
});
export type UpdateUserDTO = z.infer<typeof UpdateUserDTO>;

// ─── Tier (rank) — admin-assigned, mirrors domain/tiers.ts (single source) ────
export const TIERS = TIER_DEFS.map((td) => td.key) as readonly string[];
export type Tier = string;

export const UpdateUserTierDTO = z.object({
  tier: z.enum(TIER_DEFS.map((td) => td.key) as [string, ...string[]]),
});
export type UpdateUserTierDTO = z.infer<typeof UpdateUserTierDTO>;

export const UpdateUserRoleDTO = z.object({
  role: z.enum(['user', 'admin']),
});
export type UpdateUserRoleDTO = z.infer<typeof UpdateUserRoleDTO>;

export const BanUserDTO = z.object({
  reason: z.string().min(3).max(500),
});
export type BanUserDTO = z.infer<typeof BanUserDTO>;

// ─── Shared query models ──────────────────────────────────────────────────────
// z.coerce.number() coerces numeric query strings ("?page=2" → 2), matching
// the old t.Numeric behaviour; .default() fills absent params.
export const Pagination = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const AdminPagination = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

// ─── Reports & badges ─────────────────────────────────────────────────────────
export const ReportDTO = z.object({
  targetType: z.enum(['thread', 'post', 'user']),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(500),
});
export type ReportDTO = z.infer<typeof ReportDTO>;

export const ReportStatusDTO = z.object({
  status: z.enum(['open', 'reviewed', 'dismissed']),
});
export type ReportStatusDTO = z.infer<typeof ReportStatusDTO>;

export const ReportQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
});

export const GrantBadgeDTO = z.object({
  badgeKey: z.string().min(1).max(50),
});
export type GrantBadgeDTO = z.infer<typeof GrantBadgeDTO>;

// key is lowercase letters/digits/underscore so it's a safe stable identifier.
export const CreateBadgeDTO = z.object({
  key: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  icon: z.string().min(1).max(16),
});
export type CreateBadgeDTO = z.infer<typeof CreateBadgeDTO>;

export const UpdateBadgeDTO = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(300).optional(),
  icon: z.string().min(1).max(16).optional(),
});
export type UpdateBadgeDTO = z.infer<typeof UpdateBadgeDTO>;

// User payload stored in JWT
export interface JwtPayload {
  userId: string;
}
```

Notes:
- `IdParam`, `BadgeParam`, `BadgeKeyParam` are **dropped**: a matched Hono path param is always a non-empty string, so `minLength: 1` validation was a no-op. Handlers read `c.req.param('id')` directly.
- The old `.static` type extraction becomes `z.infer<>` with identical resulting types.

- [ ] **Step 3: Typecheck to find every consumer that needs updating** (expected to fail at this point — routes still import Elysia):

```bash
cd backend && bun run typecheck 2>&1 | head -40
```
Expected: errors only in `src/routes/*`, `src/http/*`, `src/index.ts` (fixed by later tasks) — none in `src/services/*` or elsewhere. If a service errors on a DTO type, fix the schema (not the service) to restore the old type shape.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/bun.lock backend/src/types/index.ts
git commit -m "feat(backend): swap Elysia deps for Hono, rewrite DTOs in Zod"
```

---

### Task 2: HTTP middleware — auth, rate limit, security, validation

**Files:**
- Modify: `backend/src/http/auth.ts` (full replace)
- Modify: `backend/src/http/rateLimit.ts` (full replace)
- Modify: `backend/src/http/security.ts` (full replace)
- Create: `backend/src/http/validate.ts`

- [ ] **Step 1: Replace `backend/src/http/auth.ts` with Hono middleware:**

```ts
import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
import type { JwtPayload } from '../types/index.js';
import { jwtSecret } from '../config/jwt.js';

/** Hono context variables set by the auth middlewares. */
export type AuthEnv = { Variables: { user: JwtPayload } };
export type OptionalAuthEnv = { Variables: { user: JwtPayload | null } };

/** Verify a `Bearer <token>` header. Returns the payload, or null when missing/invalid. */
export function verifyBearer(authHeader?: string): JwtPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  try {
    return jwt.verify(token, jwtSecret) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Require a valid token + non-banned account; sets `user: JwtPayload`.
 * Loads the user row so a freshly-banned holder of a still-valid token is blocked.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const payload = verifyBearer(c.req.header('authorization'));
  if (!payload) return c.json({ error: 'Unauthorized: Missing or invalid token format' }, 401);
  const row = await userRepository.findById(payload.userId);
  if (!row) return c.json({ error: 'Unauthorized' }, 401);
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
  c.set('user', { userId: row.id });
  await next();
});

/** Never blocks; sets `user: JwtPayload | null` (personalizes responses when logged in). */
export const optionalAuth = createMiddleware<OptionalAuthEnv>(async (c, next) => {
  c.set('user', verifyBearer(c.req.header('authorization')));
  await next();
});

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

- [ ] **Step 2: Replace `backend/src/http/rateLimit.ts`:**

```ts
import type { Context, Next } from 'hono';
import { getConnInfo } from 'hono/bun';

interface LimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Faithful in-memory port of express-rate-limit: fixed window, per-IP buckets.
 * Returns Hono middleware. Each call to `makeLimiter` owns its own bucket store.
 *
 * Client IP via Bun's connection info matches the previous behaviour
 * (socket peer, no `trust proxy`).
 */
export function makeLimiter({ windowMs, max, message }: LimitOptions) {
  const hits = new Map<string, { count: number; reset: number }>();

  return async (c: Context, next: Next) => {
    let ip = 'unknown';
    try {
      ip = getConnInfo(c).remote.address ?? 'unknown';
    } catch {
      /* keep 'unknown' */
    }
    const now = Date.now();
    const rec = hits.get(ip);

    if (!rec || rec.reset <= now) {
      hits.set(ip, { count: 1, reset: now + windowMs });
      return next();
    }

    rec.count += 1;
    if (rec.count > max) {
      return c.json({ error: message }, 429);
    }
    return next();
  };
}

// ─── Auth-specific limiters (attach per-route) ────────────────────────────────
export const loginRateLimit = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const registerRateLimit = makeLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many registration attempts. Please try again later.',
});

export const forgotPasswordRateLimit = makeLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset requests. Please try again in 1 hour.',
});

export const googleRateLimit = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many Google sign-in attempts. Please try again in 15 minutes.',
});

export const refreshRateLimit = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: 'Too many token refresh attempts. Please try again later.',
});

// ─── Global limiter (generous; just prevents abuse) ───────────────────────────
// Skips static uploads so image-heavy pages aren't throttled.
const globalLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: 'Too many requests. Please slow down.',
});

export const globalRateLimit = async (c: Context, next: Next) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/uploads')) return next();
  return globalLimiter(c, next);
};
```

- [ ] **Step 3: Replace `backend/src/http/security.ts`:**

```ts
import type { Context, Next } from 'hono';

/**
 * Minimal security headers (replaces `helmet`).
 *
 * `Cross-Origin-Resource-Policy: cross-origin` is the important one — it lets the
 * frontend (a different origin) load images served from this backend.
 */
export const security = async (c: Context, next: Next) => {
  await next();
  c.header('cross-origin-resource-policy', 'cross-origin');
  c.header('x-content-type-options', 'nosniff');
  c.header('x-frame-options', 'SAMEORIGIN');
  c.header('x-dns-prefetch-control', 'off');
  c.header('referrer-policy', 'no-referrer');
};
```

- [ ] **Step 4: Create `backend/src/http/validate.ts`** — a thin wrapper around `zValidator` that produces the same validation-error envelope Elysia did:

```ts
import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';

type Target = 'json' | 'query' | 'param' | 'form';

/**
 * zValidator with the app's error contract: 400 `{ error: "Validation Error" }`,
 * plus zod issue details outside production (mirrors the old Elysia handler).
 */
export const validate = <T extends ZodType>(target: Target, schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const body: { error: string; details?: unknown } = { error: 'Validation Error' };
      if (process.env.NODE_ENV !== 'production') body.details = result.error.issues;
      return c.json(body, 400);
    }
  });
```

- [ ] **Step 5: Typecheck the http directory compiles** (routes still broken until later tasks):

```bash
cd backend && bun run typecheck 2>&1 | grep -c "src/http/" || echo "http clean"
```
Expected: `http clean` (0 errors in src/http).

- [ ] **Step 6: Commit**

```bash
git add backend/src/http
git commit -m "feat(backend): port auth, rate-limit, security middleware to Hono + zod validate helper"
```

---

### Task 3: Simple route files (badge, report, search, like, user, post, forum, thread, share)

**Files (modify each, full replace):**
- `backend/src/routes/badge.routes.ts`
- `backend/src/routes/report.routes.ts`
- `backend/src/routes/search.routes.ts`
- `backend/src/routes/like.routes.ts`
- `backend/src/routes/user.routes.ts`
- `backend/src/routes/post.routes.ts`
- `backend/src/routes/forum.routes.ts`
- `backend/src/routes/thread.routes.ts`
- `backend/src/routes/share.routes.ts`

Route files export a plain `Hono` sub-app **without** the prefix — `index.ts` mounts each at its prefix via `app.route('/threads', threadRoutes)` (Task 5). Handler idioms:

- `c.get('user')` for the auth user; in required-auth handlers the middleware guarantees it.
- `c.req.param('x')` for params (no schema needed — matched params are non-empty).
- `c.req.valid('json' | 'query')` for validated bodies/queries.
- 201: `c.json(result, 201)`. 204: `c.body(null, 204)`.

- [ ] **Step 1: `badge.routes.ts`**

```ts
import { Hono } from 'hono';
import { badgeService } from '../services/badge.service.js';

// Public, unauthenticated badge catalog so normal users can discover badges.
// (Admin manage flows stay under /admin/* with the admin guard.)
export const badgeRoutes = new Hono().get('/catalog', async (c) => c.json(await badgeService.catalog()));
```

- [ ] **Step 2: `report.routes.ts`**

```ts
import { Hono } from 'hono';
import { reportService } from '../services/report.service.js';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { ReportDTO } from '../types/index.js';

export const reportRoutes = new Hono<AuthEnv>().post(
  '/',
  requireAuth,
  validate('json', ReportDTO),
  async (c) => c.json(await reportService.create(c.get('user').userId, c.req.valid('json'))),
);
```

- [ ] **Step 3: `search.routes.ts`**

```ts
import { Hono } from 'hono';
import { searchRepository } from '../repositories/search.repository.js';

export const searchRoutes = new Hono().get('/', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  if (!q) return c.json({ forums: [], threads: [] });
  return c.json(await searchRepository.search(q));
});
```

- [ ] **Step 4: `like.routes.ts`**

```ts
import { Hono } from 'hono';
import { likeService } from '../services/like.service.js';
import { requireAuth, type AuthEnv } from '../http/auth.js';

export const likeRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post('/thread/:id', async (c) =>
    c.json(await likeService.toggleThreadLike(c.get('user').userId, c.req.param('id'))),
  )
  .post('/post/:id', async (c) =>
    c.json(await likeService.togglePostLike(c.get('user').userId, c.req.param('id'))),
  );
```

- [ ] **Step 5: `user.routes.ts`** (route order matters: `/me` before `/:id`):

```ts
import { Hono } from 'hono';
import { userService } from '../services/user.service.js';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { UpdateUserDTO } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const userRoutes = new Hono<AuthEnv>()
  // Protected routes (defined before /:id so 'me' isn't captured as an id param)
  .get('/me', requireAuth, async (c) => c.json(await userService.getProfile(c.get('user').userId)))
  .put('/me', requireAuth, validate('json', UpdateUserDTO), async (c) => {
    const body = c.req.valid('json');
    if (Object.keys(body).length === 0) throw BadRequestError('At least one field must be provided');
    return c.json(await userService.updateProfile(c.get('user').userId, body));
  })
  // Public route
  .get('/:id', async (c) => c.json(await userService.getPublicProfile(c.req.param('id'))));
```

- [ ] **Step 6: `post.routes.ts`**

```ts
import { Hono } from 'hono';
import { postService } from '../services/post.service.js';
import { requireAuth, optionalAuth, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { CreatePostDTO, UpdatePostDTO, Pagination } from '../types/index.js';

export const postRoutes = new Hono<OptionalAuthEnv>()
  // Get posts for a thread — optional auth so isLikedByMe is populated for logged-in users
  .get('/thread/:threadId', optionalAuth, validate('query', Pagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    return c.json(
      await postService.getPostsByThreadId(c.req.param('threadId'), page, limit, c.get('user')?.userId),
    );
  })
  // Protected routes
  .post('/', requireAuth, validate('json', CreatePostDTO), async (c) =>
    c.json(await postService.createPost(c.get('user')!.userId, c.req.valid('json')), 201),
  )
  .put('/:id', requireAuth, validate('json', UpdatePostDTO), async (c) =>
    c.json(await postService.updatePost(c.get('user')!.userId, c.req.param('id'), c.req.valid('json'))),
  )
  .delete('/:id', requireAuth, async (c) => {
    await postService.deletePost(c.get('user')!.userId, c.req.param('id'));
    return c.body(null, 204);
  });
```

- [ ] **Step 7: `forum.routes.ts`**

```ts
import { Hono } from 'hono';
import { forumService } from '../services/forum.service.js';
import { requireAuth, requireAdmin, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { CreateForumDTO, UpdateForumDTO } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const forumRoutes = new Hono<OptionalAuthEnv>()
  .get('/', async (c) => c.json(await forumService.getAllForums()))
  .get('/:id', async (c) => c.json(await forumService.getForumById(c.req.param('id'))))
  .post('/', requireAdmin, validate('json', CreateForumDTO), async (c) =>
    c.json(await forumService.createForum(c.get('user')!.userId, c.req.valid('json')), 201),
  )
  .put('/:id', requireAuth, validate('json', UpdateForumDTO), async (c) => {
    const body = c.req.valid('json');
    if (Object.keys(body).length === 0)
      throw BadRequestError('At least one field (name or description) must be provided');
    return c.json(await forumService.updateForum(c.get('user')!.userId, c.req.param('id'), body));
  })
  .delete('/:id', requireAuth, async (c) => {
    await forumService.deleteForum(c.get('user')!.userId, c.req.param('id'));
    return c.body(null, 204);
  });
```

- [ ] **Step 8: `thread.routes.ts`**

```ts
import { Hono } from 'hono';
import { threadService } from '../services/thread.service.js';
import { requireAuth, optionalAuth, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { CreateThreadDTO, UpdateThreadDTO, Pagination } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const threadRoutes = new Hono<OptionalAuthEnv>()
  // Public routes with optional auth (so likes are personalized for logged-in users)
  .get('/', optionalAuth, async (c) => c.json(await threadService.getAllThreads()))
  .get('/forum/:forumId', optionalAuth, validate('query', Pagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    return c.json(
      await threadService.getThreadsByForumId(c.req.param('forumId'), page, limit, c.get('user')?.userId),
    );
  })
  .get('/:id', optionalAuth, async (c) =>
    c.json(await threadService.getThreadById(c.req.param('id'), c.get('user')?.userId)),
  )
  // Protected routes
  .post('/', requireAuth, validate('json', CreateThreadDTO), async (c) =>
    c.json(await threadService.createThread(c.get('user')!.userId, c.req.valid('json')), 201),
  )
  .put('/:id', requireAuth, validate('json', UpdateThreadDTO), async (c) => {
    const body = c.req.valid('json');
    if (Object.keys(body).length === 0)
      throw BadRequestError('At least one field (title or content) must be provided');
    return c.json(await threadService.updateThread(c.get('user')!.userId, c.req.param('id'), body));
  })
  .delete('/:id', requireAuth, async (c) => {
    await threadService.deleteThread(c.get('user')!.userId, c.req.param('id'));
    return c.body(null, 204);
  })
  .patch('/:id/pin', requireAuth, async (c) =>
    c.json(await threadService.pinThread(c.get('user')!.userId, c.req.param('id'))),
  )
  .patch('/:id/lock', requireAuth, async (c) =>
    c.json(await threadService.lockThread(c.get('user')!.userId, c.req.param('id'))),
  );
```

- [ ] **Step 9: `share.routes.ts`** (HTML responses, not JSON):

```ts
import { Hono } from 'hono';
import { shareService } from '../services/share.service.js';

export const shareRoutes = new Hono()
  .get('/thread/:id', async (c) => {
    const out = await shareService.threadOg(c.req.param('id'));
    return out ? c.html(out) : c.text('Not found', 404);
  })
  .get('/post/:id', async (c) => {
    const out = await shareService.postOg(c.req.param('id'));
    return out ? c.html(out) : c.text('Not found', 404);
  })
  .get('/forum/:id', async (c) => {
    const out = await shareService.forumOg(c.req.param('id'));
    return out ? c.html(out) : c.text('Not found', 404);
  })
  .get('/user/:id', async (c) => {
    const out = await shareService.userOg(c.req.param('id'));
    return out ? c.html(out) : c.text('Not found', 404);
  });
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/routes
git commit -m "feat(backend): port badge, report, search, like, user, post, forum, thread, share routes to Hono"
```

---

### Task 4: Complex route files (auth, upload, attachment, admin)

**Files (modify each, full replace):**
- `backend/src/routes/auth.routes.ts`
- `backend/src/routes/upload.routes.ts`
- `backend/src/routes/attachment.routes.ts`
- `backend/src/routes/admin.routes.ts`

- [ ] **Step 1: `auth.routes.ts`** — per-route rate limiters run before validation:

```ts
import { Hono } from 'hono';
import { authService } from '../services/auth.service.js';
import { validate } from '../http/validate.js';
import {
  RegisterDTO,
  LoginDTO,
  GoogleAuthDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  RefreshDTO,
  LogoutDTO,
} from '../types/index.js';
import {
  loginRateLimit,
  registerRateLimit,
  forgotPasswordRateLimit,
  googleRateLimit,
  refreshRateLimit,
} from '../http/rateLimit.js';

export const authRoutes = new Hono()
  .post('/register', registerRateLimit, validate('json', RegisterDTO), async (c) =>
    c.json(await authService.register(c.req.valid('json')), 201),
  )
  .post('/login', loginRateLimit, validate('json', LoginDTO), async (c) =>
    c.json(await authService.login(c.req.valid('json'))),
  )
  .post('/google', googleRateLimit, validate('json', GoogleAuthDTO), async (c) =>
    c.json(await authService.googleAuth(c.req.valid('json'))),
  )
  .post('/forgot-password', forgotPasswordRateLimit, validate('json', ForgotPasswordDTO), async (c) =>
    c.json(await authService.forgotPassword(c.req.valid('json'))),
  )
  .post('/reset-password', validate('json', ResetPasswordDTO), async (c) =>
    c.json(await authService.resetPassword(c.req.valid('json'))),
  )
  .post('/refresh', refreshRateLimit, validate('json', RefreshDTO), async (c) =>
    c.json(await authService.refresh(c.req.valid('json').refreshToken)),
  )
  .post('/logout', validate('json', LogoutDTO), async (c) =>
    c.json(await authService.logout(c.req.valid('json').refreshToken)),
  );
```

- [ ] **Step 2: `upload.routes.ts`** — multipart file fields validated manually via `parseBody` (Elysia's `t.File` checks become explicit checks with the same 400 envelope):

```ts
import { Hono } from 'hono';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { storage } from '../services/storage.service.js';
import { userRepository } from '../repositories/user.repository.js';

// image/jpg isn't a real MIME but the old multer filter accepted it — keep it for parity.
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/** Validate a multipart image field: presence, MIME whitelist, size cap. */
function checkImage(value: unknown, maxBytes: number): File | { error: string } {
  if (!(value instanceof File)) return { error: 'Validation Error' };
  if (!IMAGE_MIMES.includes(value.type)) return { error: 'Validation Error' };
  if (value.size > maxBytes) return { error: 'Validation Error' };
  return value;
}

export const uploadRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  // Avatar (5MB) — persists the URL on the user record
  .post('/avatar', async (c) => {
    const body = await c.req.parseBody();
    const file = checkImage(body['avatar'], 5 * 1024 * 1024);
    if (!(file instanceof File)) return c.json(file, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storage.upload(
      { buffer, originalname: file.name, mimetype: file.type },
      'avatar',
    );
    await userRepository.update(c.get('user').userId, { avatar: url });
    return c.json({ url });
  })
  // Content image (10MB) — for markdown editor paste/drop
  .post('/image', async (c) => {
    const body = await c.req.parseBody();
    const file = checkImage(body['image'], 10 * 1024 * 1024);
    if (!(file instanceof File)) return c.json(file, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storage.upload(
      { buffer, originalname: file.name, mimetype: file.type },
      'img',
    );
    return c.json({ url });
  });
```

- [ ] **Step 3: `attachment.routes.ts`** — keep `bridgeCdnErrors` verbatim; JSON bodies via `validate`, the chunk via `parseBody`:

```ts
import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { attachmentUploadRepository } from '../repositories/attachmentUpload.repository.js';
import { CdnHttpError, cdnMultipart } from '../services/cdn-multipart.service.js';
import { AppError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Keep this in sync with Axite's UPLOAD_MAX_CHUNK_BYTES (95MB) + a little slack.
const MAX_CHUNK_BYTES = 96 * 1024 * 1024;

const CreateAttachmentDTO = z.object({
  filename: z.string().min(1).max(512),
  mime: z.string().max(255),
  size: z.coerce.number().min(1),
});

const PartQuery = z.object({
  object_key: z.string(),
  upload_id: z.string(),
  part_number: z.string(),
});

const CompleteDTO = z.object({
  object_key: z.string(),
  upload_id: z.string(),
  parts: z
    .array(z.object({ part_number: z.coerce.number(), etag: z.string() }))
    .min(1),
});

const AbortDTO = z.object({ object_key: z.string(), upload_id: z.string() });

/**
 * Map a CdnHttpError's real upstream status to a forum-facing one: pass
 * through 4xx as-is (the CDN's quota/rate-limit/not-found signal is still
 * meaningful to a client), collapse any CDN-side 5xx to 502 so an Axite
 * outage isn't reported as if it were the forum backend's own bug.
 *
 * 4xx messages are passed through (intentionally client-facing strings like
 * "quota exceeded"); 5xx messages are NOT — they may embed up to 300 raw
 * characters of Axite's own error body (internal hostnames, driver errors),
 * so the client gets a generic message while the real one is logged
 * server-side (the global error handler only logs non-AppError throws, and
 * this function converts CdnHttpError to AppError, so it would otherwise
 * go unlogged).
 */
async function bridgeCdnErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof CdnHttpError) {
      const isClientError = err.status >= 400 && err.status < 500;
      if (!isClientError) logger.error('CDN multipart upload failed', { error: err.message, status: err.status });
      throw new AppError(
        isClientError ? err.status : 502,
        isClientError ? err.message : 'Upload service temporarily unavailable',
      );
    }
    throw err;
  }
}

export const attachmentRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post('/create', validate('json', CreateAttachmentDTO), async (c) => {
    const result = await bridgeCdnErrors(() => cdnMultipart.create(c.req.valid('json')));
    await attachmentUploadRepository.record({
      uploadId: result.upload_id,
      objectKey: result.object_key,
      userId: c.get('user').userId,
    });
    return c.json(result);
  })
  .put('/part', validate('query', PartQuery), async (c) => {
    const query = c.req.valid('query');
    const owned = await attachmentUploadRepository.isOwnedBy({
      uploadId: query.upload_id,
      objectKey: query.object_key,
      userId: c.get('user').userId,
    });
    if (!owned) throw ForbiddenError('Upload not found');

    const body = await c.req.parseBody();
    const chunk = body['chunk'];
    if (!(chunk instanceof File)) return c.json({ error: 'Validation Error' }, 400);

    const buffer = Buffer.from(await chunk.arrayBuffer());
    if (buffer.length > MAX_CHUNK_BYTES) {
      throw BadRequestError('Chunk too large');
    }
    return c.json(
      await bridgeCdnErrors(() =>
        cdnMultipart.uploadPart({
          objectKey: query.object_key,
          uploadId: query.upload_id,
          partNumber: Number(query.part_number),
          body: buffer,
        }),
      ),
    );
  })
  .post('/complete', validate('json', CompleteDTO), async (c) => {
    const body = c.req.valid('json');
    const owned = await attachmentUploadRepository.isOwnedBy({
      uploadId: body.upload_id,
      objectKey: body.object_key,
      userId: c.get('user').userId,
    });
    if (!owned) throw ForbiddenError('Upload not found');

    const result = await bridgeCdnErrors(() =>
      cdnMultipart.complete({
        objectKey: body.object_key,
        uploadId: body.upload_id,
        parts: body.parts,
      }),
    );
    await attachmentUploadRepository.deleteByUploadId(body.upload_id);
    return c.json(result);
  })
  .post('/abort', validate('json', AbortDTO), async (c) => {
    const body = c.req.valid('json');
    const owned = await attachmentUploadRepository.isOwnedBy({
      uploadId: body.upload_id,
      objectKey: body.object_key,
      userId: c.get('user').userId,
    });
    if (!owned) throw ForbiddenError('Upload not found');

    const result = await bridgeCdnErrors(() =>
      cdnMultipart.abort({ objectKey: body.object_key, uploadId: body.upload_id }),
    );
    await attachmentUploadRepository.deleteByUploadId(body.upload_id);
    return c.json(result);
  });
```

Note: the inline `CreateAttachmentDTO`/`PartQuery`/`CompleteDTO`/`AbortDTO` schemas were inline TypeBox objects in the Elysia version too — they stay local to this file, not in `types/index.ts`.

- [ ] **Step 4: `admin.routes.ts`** — all routes behind `requireAdmin`:

```ts
import { Hono } from 'hono';
import { requireAdmin, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { adminRepository } from '../repositories/admin.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { reportService } from '../services/report.service.js';
import { badgeService } from '../services/badge.service.js';
import {
  AdminPagination,
  UpdateUserRoleDTO,
  UpdateUserTierDTO,
  ReportQuery,
  ReportStatusDTO,
  GrantBadgeDTO,
  CreateBadgeDTO,
  UpdateBadgeDTO,
  BanUserDTO,
} from '../types/index.js';

export const adminRoutes = new Hono<AuthEnv>()
  .use(requireAdmin)
  // ─── Stats & Activity ──────────────────────────────────────────────────
  .get('/stats', async (c) => c.json(await adminRepository.getSystemStats()))
  .get('/activity', async (c) => c.json(await adminRepository.getRecentActivity(20)))
  // ─── Users ─────────────────────────────────────────────────────────────
  .get('/users', validate('query', AdminPagination), async (c) => {
    const { page, limit, search } = c.req.valid('query');
    const result = await adminRepository.getAllUsers(page, limit, search);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .patch('/users/:id/role', validate('json', UpdateUserRoleDTO), async (c) => {
    // Prevent self-demotion
    if (c.req.param('id') === c.get('user').userId)
      return c.json({ error: 'Cannot change your own role' }, 400);
    const updated = await adminRepository.updateUserRole(c.req.param('id'), c.req.valid('json').role);
    if (!updated) return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
  })
  .patch('/users/:id/tier', validate('json', UpdateUserTierDTO), async (c) => {
    const updated = await adminRepository.updateUserTier(c.req.param('id'), c.req.valid('json').tier);
    if (!updated) return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
  })
  .delete('/users/:id', async (c) => {
    if (c.req.param('id') === c.get('user').userId)
      return c.json({ error: 'Cannot delete your own account via admin panel' }, 400);
    await adminRepository.deleteUser(c.req.param('id'));
    return c.body(null, 204);
  })
  .patch('/users/:id/ban', validate('json', BanUserDTO), async (c) => {
    if (c.req.param('id') === c.get('user').userId) return c.json({ error: 'Cannot ban yourself' }, 400);
    const updated = await adminRepository.banUser(
      c.req.param('id'),
      c.req.valid('json').reason,
      c.get('user').userId,
    );
    if (!updated) return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
  })
  .patch('/users/:id/unban', async (c) => {
    const updated = await adminRepository.unbanUser(c.req.param('id'));
    if (!updated) return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
  })
  // ─── Forums ────────────────────────────────────────────────────────────
  .get('/forums', validate('query', AdminPagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    const result = await adminRepository.getAllForumsAdmin(page, limit);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .delete('/forums/:id', async (c) => {
    await forumRepository.delete(c.req.param('id'));
    return c.body(null, 204);
  })
  // ─── Threads ───────────────────────────────────────────────────────────
  .get('/threads', validate('query', AdminPagination), async (c) => {
    const { page, limit, search } = c.req.valid('query');
    const result = await adminRepository.getAllThreadsAdmin(page, limit, search);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .delete('/threads/:id', async (c) => {
    await threadRepository.delete(c.req.param('id'));
    return c.body(null, 204);
  })
  // ─── Posts ─────────────────────────────────────────────────────────────
  .get('/posts', validate('query', AdminPagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    const result = await adminRepository.getAllPostsAdmin(page, limit);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .delete('/posts/:id', async (c) => {
    await postRepository.delete(c.req.param('id'));
    return c.body(null, 204);
  })
  // ─── Reports ───────────────────────────────────────────────────────────
  .get('/reports', validate('query', ReportQuery), async (c) => {
    const { page, limit, status } = c.req.valid('query');
    const result = await reportService.list(page, limit, status);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .patch('/reports/:id', validate('json', ReportStatusDTO), async (c) =>
    c.json(await reportService.resolve(c.req.param('id'), c.req.valid('json').status)),
  )
  // ─── Badges ────────────────────────────────────────────────────────────
  .get('/badges', async (c) => c.json(await badgeService.catalog()))
  .post('/badges', validate('json', CreateBadgeDTO), async (c) => {
    const result = await badgeService.createDef(c.req.valid('json'));
    if (!result.ok) return c.json({ error: 'A badge with this key already exists' }, 409);
    return c.json(result.badge);
  })
  .put('/badges/:key', validate('json', UpdateBadgeDTO), async (c) => {
    const updated = await badgeService.updateDef(c.req.param('key'), c.req.valid('json'));
    if (!updated) return c.json({ error: 'Badge not found' }, 404);
    return c.json(updated);
  })
  .delete('/badges/:key', async (c) => {
    const removed = await badgeService.deleteDef(c.req.param('key'));
    if (!removed) return c.json({ error: 'Badge not found' }, 404);
    return c.body(null, 204);
  })
  .post('/users/:id/badges', validate('json', GrantBadgeDTO), async (c) => {
    const result = await badgeService.grant(c.req.param('id'), c.req.valid('json').badgeKey);
    if (!result.ok) {
      return result.reason === 'unknown'
        ? c.json({ error: 'Unknown badge' }, 400)
        : c.json({ error: 'User already has this badge' }, 409);
    }
    return c.json({ message: 'Badge granted' });
  })
  .delete('/users/:id/badges/:badgeKey', async (c) => {
    const removed = await badgeService.revoke(c.req.param('id'), c.req.param('badgeKey'));
    if (!removed) return c.json({ error: 'User does not have this badge' }, 404);
    return c.body(null, 204);
  });
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes
git commit -m "feat(backend): port auth, upload, attachment, admin routes to Hono"
```

---

### Task 5: App entry — index.ts

**Files:**
- Modify: `backend/src/index.ts` (full replace)

- [ ] **Step 1: Replace `backend/src/index.ts` with:**

```ts
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';

import { security } from './http/security.js';
import { globalRateLimit } from './http/rateLimit.js';
import { AppError } from './utils/errors.js';
import { logger } from './utils/logger.js';

import { authRoutes } from './routes/auth.routes.js';
import { forumRoutes } from './routes/forum.routes.js';
import { threadRoutes } from './routes/thread.routes.js';
import { postRoutes } from './routes/post.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { searchRoutes } from './routes/search.routes.js';
import { likeRoutes } from './routes/like.routes.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { attachmentRoutes } from './routes/attachment.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { shareRoutes } from './routes/share.routes.js';
import { badgeRoutes } from './routes/badge.routes.js';

const port = Number(process.env.PORT) || 3636;

// CORS — FRONTEND_URL may be a comma-separated list of origins; trailing slashes are tolerated.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Uploaded files live on disk under ./uploads and are served at /uploads.
const uploadsDir = path.join(process.cwd(), 'uploads');
// Ensure it exists on a fresh deploy (the dir is gitignored/dockerignored and
// otherwise only created lazily on first upload).
fs.mkdirSync(uploadsDir, { recursive: true });

const app = new Hono();

app.use('*', security);
app.use(
  '*',
  cors({
    // Allow non-browser requests (no Origin header) and any configured origin.
    origin: (origin) => {
      if (!origin) return origin;
      return allowedOrigins.includes(origin.replace(/\/+$/, '')) ? origin : null;
    },
    credentials: true,
  }),
);

// Serve uploaded files statically. CORP is set globally by `security` so the
// frontend (another origin) can load these images.
app.use(
  '/uploads/*',
  serveStatic({
    root: './',
  }),
);

// Global rate limiter (generous; skips /uploads inside the middleware).
app.use('*', globalRateLimit);

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/', (c) => c.text('IT.FORUM — Hono + Drizzle backend is running.'));

app.route('/auth', authRoutes);
app.route('/forums', forumRoutes);
app.route('/threads', threadRoutes);
app.route('/posts', postRoutes);
app.route('/users', userRoutes);
app.route('/search', searchRoutes);
app.route('/likes', likeRoutes);
app.route('/upload', uploadRoutes);
app.route('/upload/attachment', attachmentRoutes);
app.route('/admin', adminRoutes);
app.route('/reports', reportRoutes);
app.route('/share', shareRoutes);
app.route('/badges', badgeRoutes);

// Central error handler — preserves the `{ error: "..." }` contract the frontend expects.
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as 400);
  }
  logger.error('Unhandled error', {
    name: (err as Error)?.name,
    message: (err as Error)?.message,
    stack: (err as Error)?.stack,
  });
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ error: 'Resource not found' }, 404));

Bun.serve({
  port,
  fetch: app.fetch,
  maxRequestBodySize: 16 * 1024 * 1024, // ≥10MB image uploads (same limit as before)
});
logger.info(`IT.FORUM Hono server listening on port ${port}`);
```

**Mount-order gotcha:** `/upload/attachment` routes must win over `/upload`'s own paths. Hono resolves by specificity, and the two sub-apps have disjoint sub-paths (`/avatar`, `/image` vs `/create`, `/part`, `/complete`, `/abort`), so both mounts coexist — but keep the mounts in this order anyway and verify with the smoke test in Task 6.

- [ ] **Step 2: Typecheck**

```bash
cd backend && bun run typecheck
```
Expected: PASS, zero errors.

- [ ] **Step 3: Run existing unit tests**

```bash
cd backend && bun test
```
Expected: all 6 existing test files PASS (they don't touch the HTTP layer).

- [ ] **Step 4: Boot the server**

```bash
cd backend && bun src/index.ts &
sleep 2 && curl -s http://localhost:3636/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(backend): Hono app entry with same middleware chain and Bun.serve"
```

---

### Task 6: Contract smoke test

**Files:** none (verification only) — run against a locally booted server with the dev database.

- [ ] **Step 1: Boot** `cd backend && bun run dev` (or `dev:mock` when no local Postgres).

- [ ] **Step 2: Run the smoke matrix** — each line lists command → expected:

```bash
# Health + root
curl -s http://localhost:3636/health                       # {"status":"ok"}
curl -s http://localhost:3636/                              # IT.FORUM — Hono + Drizzle backend is running.
curl -s http://localhost:3636/nope -o /dev/null -w "%{http_code}"  # 404
curl -s http://localhost:3636/nope                          # {"error":"Resource not found"}

# Security headers
curl -sI http://localhost:3636/health | grep -i "cross-origin-resource-policy"  # cross-origin

# Validation contract
curl -s -X POST http://localhost:3636/auth/register -H "content-type: application/json" -d '{}' \
  -o /dev/null -w "%{http_code}"                            # 400
curl -s -X POST http://localhost:3636/auth/register -H "content-type: application/json" -d '{}' | head -c 60
                                                            # {"error":"Validation Error","details":[...

# Auth flow
curl -s -X POST http://localhost:3636/auth/register -H "content-type: application/json" \
  -d '{"name":"Smoke Test","email":"smoke@test.dev","password":"password123"}' -w "\n%{http_code}"
                                                            # user+tokens JSON, 201
curl -s -X POST http://localhost:3636/auth/login -H "content-type: application/json" \
  -d '{"email":"smoke@test.dev","password":"password123"}'  # {"token":...,"refreshToken":...}
# Save the token as $TOK for the following:

# Authenticated + optional-auth routes
curl -s http://localhost:3636/users/me -H "authorization: Bearer $TOK"   # profile JSON
curl -s http://localhost:3636/users/me -o /dev/null -w "%{http_code}"    # 401 (no token)
curl -s http://localhost:3636/forums                        # forum list JSON
curl -s http://localhost:3636/threads                       # thread list JSON
curl -s "http://localhost:3636/search?q="                   # {"forums":[],"threads":[]}
curl -s http://localhost:3636/badges/catalog                # badge catalog JSON

# Admin guard
curl -s http://localhost:3636/admin/stats -H "authorization: Bearer $TOK" -o /dev/null -w "%{http_code}"
                                                            # 403 (non-admin)

# Share (HTML content type)
curl -sI http://localhost:3636/share/thread/someid | grep -i "content-type"
                                                            # text/html (200) or 404 for unknown id

# Static uploads dir
curl -s http://localhost:3636/uploads/does-not-exist.png -o /dev/null -w "%{http_code}"  # 404
```

- [ ] **Step 3: Exercise a full thread flow with the token** — create thread (`POST /threads` with valid `forumId`) → expect 201; `GET /threads/:id` → thread JSON; `POST /likes/thread/:id` → like toggled; `PUT /threads/:id` with `{}` → 400 `{"error":"At least one field (title or content) must be provided"}`; `DELETE /threads/:id` → 204 empty body.

- [ ] **Step 4: Fix any contract mismatch found, re-run the failing check, then commit fixes**

```bash
git add -A backend/src
git commit -m "fix(backend): contract fixes found in Hono migration smoke test"
```

---

### Task 7: Docker build check

- [ ] **Step 1: Confirm `backend/Dockerfile` needs no changes** — it runs `bun` with the same entry (`src/index.ts`) and the same `migrate`-on-start CMD; nothing references Elysia. If it does reference removed packages, update it.

- [ ] **Step 2: Build the image**

```bash
cd backend && docker build -t forum-backend-hono-test .
```
Expected: build succeeds.

- [ ] **Step 3: Commit any Dockerfile change (skip if none)**

```bash
git add backend/Dockerfile && git commit -m "chore(backend): dockerfile updates for Hono migration"
```
