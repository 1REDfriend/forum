// Single source for the JWT signing/verification secret. In production a real
// secret is mandatory; in dev we fall back to a fixed dev-only string.
export const jwtSecret =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('JWT_SECRET environment variable must be set in production');
      })()
    : 'fallback-secret-for-dev-only');
