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
