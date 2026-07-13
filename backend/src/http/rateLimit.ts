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
