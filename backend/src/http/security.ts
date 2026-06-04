import { Elysia } from 'elysia';

/**
 * Minimal security headers (replaces `helmet`). We set these ourselves rather
 * than using `elysia-helmet`, which currently requires `aot: false` and breaks
 * the OpenAPI docs page.
 *
 * `Cross-Origin-Resource-Policy: cross-origin` is the important one — it lets the
 * frontend (a different origin) load images served from this backend. Static file
 * responses also get it via the `headers` option passed to the static plugin.
 */
export const security = new Elysia({ name: 'security' }).onAfterHandle({ as: 'global' }, ({ set }) => {
  set.headers['cross-origin-resource-policy'] = 'cross-origin';
  set.headers['x-content-type-options'] = 'nosniff';
  set.headers['x-frame-options'] = 'SAMEORIGIN';
  set.headers['x-dns-prefetch-control'] = 'off';
  set.headers['referrer-policy'] = 'no-referrer';
});
