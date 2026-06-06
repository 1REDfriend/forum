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
  // Require a valid token; injects `user: JwtPayload`.
  auth: {
    resolve({ headers }) {
      const user = verifyBearer(headers.authorization);
      if (!user) return status(401, { error: 'Unauthorized: Missing or invalid token format' });
      return { user };
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
      return { user };
    },
  },
});
