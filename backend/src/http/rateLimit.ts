import { Elysia, status } from 'elysia';

interface LimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

// Minimal structural shape of what we need from Elysia's context (avoids Bun's
// generic Server type); Elysia's real context is assignable to this.
interface LimiterContext {
  request: Request;
  server: { requestIP(request: Request): { address: string } | null } | null;
}

/**
 * Faithful in-memory port of express-rate-limit: fixed window, per-IP buckets.
 * Returns a hook usable as a route-local `beforeHandle` or inside a plugin.
 * Each call to `makeLimiter` owns its own bucket store (one window/limit set).
 *
 * Client IP via Bun's `server.requestIP` matches Express's default (no `trust proxy`),
 * i.e. the socket peer — same behaviour the app had before.
 */
export function makeLimiter({ windowMs, max, message }: LimitOptions) {
  const hits = new Map<string, { count: number; reset: number }>();

  return ({ request, server }: LimiterContext) => {
    const ip = server?.requestIP(request)?.address ?? 'unknown';
    const now = Date.now();
    const rec = hits.get(ip);

    if (!rec || rec.reset <= now) {
      hits.set(ip, { count: 1, reset: now + windowMs });
      return;
    }

    rec.count += 1;
    if (rec.count > max) {
      return status(429, { error: message });
    }
  };
}

// ─── Auth-specific limiters (attach as route-local `beforeHandle`) ────────────
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
// Skips static uploads and the OpenAPI docs so image-heavy pages aren't throttled
// (mirrors the old setup where /uploads was mounted before the global limiter).
const globalLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: 'Too many requests. Please slow down.',
});

export const globalRateLimit = new Elysia({ name: 'rate-limit-global' }).onBeforeHandle(
  { as: 'global' },
  (ctx) => {
    const path = new URL(ctx.request.url).pathname;
    if (path.startsWith('/uploads') || path.startsWith('/openapi')) return;
    return globalLimiter(ctx);
  },
);
