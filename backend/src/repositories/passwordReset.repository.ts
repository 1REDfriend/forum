import { eq, and, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { passwordResetTokens } from '../db/schema.js';
import crypto from 'crypto';

const hash = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

export class PasswordResetRepository {
  async createToken(userId: string): Promise<string> {
    // Invalidate all previous tokens for this user
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt)
        )
      );

    const raw = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({ userId, token: hash(raw), expiresAt });
    return raw;
  }

  async findValidToken(token: string) {
    const now = new Date();
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, hash(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now)
        )
      );
    return row;
  }

  async markUsed(id: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }
}

export const passwordResetRepository = new PasswordResetRepository();
