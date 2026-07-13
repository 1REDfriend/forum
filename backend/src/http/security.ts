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
