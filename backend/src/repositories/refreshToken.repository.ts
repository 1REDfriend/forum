import { eq, and, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { refreshTokens } from '../db/schema.js';
import crypto from 'crypto';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Only a SHA-256 hash of the token is stored, so a DB leak can't be replayed.
const hash = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

export class RefreshTokenRepository {
  /** Issue a new refresh token: store its hash, return the raw value (shown to the client once). */
  async issue(userId: number): Promise<string> {
    const raw = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await db.insert(refreshTokens).values({ userId, tokenHash: hash(raw), expiresAt });
    return raw;
  }

  /** Find a live (not revoked, not expired) token row by its raw value. */
  async findValid(raw: string) {
    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, hash(raw)),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      );
    return row;
  }

  async revokeById(id: number): Promise<void> {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  }

  /** Revoke by raw value (logout) — no-op if it doesn't exist. */
  async revokeRaw(raw: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, hash(raw)));
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
