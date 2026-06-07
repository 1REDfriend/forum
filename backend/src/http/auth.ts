import { Elysia, status } from 'elysia';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
import type { JwtPayload } from '../types/index.js';
import { jwtSecret } from '../config/jwt.js';

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
 * Auth plugin exposing three route-level macros (replaces the Express
 * auth/admin middlewares). Used as `{ auth: true }`, `{ optionalAuth: true }`,
 * or `{ admin: true }` on routes/guards. `name` lets Elysia dedupe it across modules.
 */
export const auth = new Elysia({ name: 'auth' }).macro({
  // Require a valid token + non-banned account; injects `user: JwtPayload`.
  // Loads the user row so a freshly-banned holder of a still-valid token is blocked.
  auth: {
    async resolve({ headers }) {
      const payload = verifyBearer(headers.authorization);
      if (!payload) return status(401, { error: 'Unauthorized: Missing or invalid token format' });
      const row = await userRepository.findById(payload.userId);
      if (!row) return status(401, { error: 'Unauthorized' });
      if (row.isBanned) {
        return status(403, {
          error: 'Account banned',
          reason: row.banReason || 'No reason provided',
          bannedAt: row.bannedAt,
        });
      }
      return { user: { userId: row.id } };
    },
  },
  // Never blocks; injects `user: JwtPayload | null` (personalizes responses when logged in).
  optionalAuth: {
    resolve({ headers }) {
      return { user: verifyBearer(headers.authorization) };
    },
  },
  // Require an authenticated admin (DB role check); injects `user: JwtPayload`.
  admin: {
    async resolve({ headers }) {
      const user = verifyBearer(headers.authorization);
      if (!user) return status(401, { error: 'Unauthorized' });
      const row = await userRepository.findById(user.userId);
      if (!row || row.role !== 'admin') return status(403, { error: 'Forbidden: Admin access required' });
      if (row.isBanned) {
        return status(403, {
          error: 'Account banned',
          reason: row.banReason || 'No reason provided',
          bannedAt: row.bannedAt,
        });
      }
      return { user };
    },
  },
});
