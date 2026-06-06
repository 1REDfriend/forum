import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userBadges } from '../db/schema.js';

export class UserBadgeRepository {
  async listForUser(userId: string) {
    return db
      .select({ badgeKey: userBadges.badgeKey, awardedAt: userBadges.awardedAt })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
  }

  /** Idempotent award (unique on user+key). */
  async award(userId: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await db
      .insert(userBadges)
      .values(keys.map((badgeKey) => ({ userId, badgeKey })))
      .onConflictDoNothing();
  }
}

export const userBadgeRepository = new UserBadgeRepository();
