import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userBadges } from '../db/schema.js';

export class UserBadgeRepository {
  async listForUser(userId: string) {
    return db
      .select({ badgeKey: userBadges.badgeKey, awardedAt: userBadges.awardedAt })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
  }

  /** Idempotent award (unique on user+key). Dedups the input batch first. */
  async award(userId: string, keys: string[]): Promise<void> {
    const unique = [...new Set(keys)];
    if (unique.length === 0) return;
    await db
      .insert(userBadges)
      .values(unique.map((badgeKey) => ({ userId, badgeKey })))
      .onConflictDoNothing({ target: [userBadges.userId, userBadges.badgeKey] });
  }

  /** True if the user already holds this badge. */
  async has(userId: string, badgeKey: string): Promise<boolean> {
    const [row] = await db
      .select({ badgeKey: userBadges.badgeKey })
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeKey, badgeKey)))
      .limit(1);
    return !!row;
  }

  /** Remove a badge. Returns true if a row was actually deleted. */
  async revoke(userId: string, badgeKey: string): Promise<boolean> {
    const deleted = await db
      .delete(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeKey, badgeKey)))
      .returning({ badgeKey: userBadges.badgeKey });
    return deleted.length > 0;
  }

  /** Badge keys for many users at once → Map<userId, keys[]>. */
  async listKeysForUsers(userIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (userIds.length === 0) return map;
    const rows = await db
      .select({ userId: userBadges.userId, badgeKey: userBadges.badgeKey })
      .from(userBadges)
      .where(inArray(userBadges.userId, userIds));
    for (const r of rows) {
      const arr = map.get(r.userId);
      if (arr) arr.push(r.badgeKey);
      else map.set(r.userId, [r.badgeKey]);
    }
    return map;
  }
}

export const userBadgeRepository = new UserBadgeRepository();
