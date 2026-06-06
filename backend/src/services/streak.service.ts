import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const ymd = (d: Date): string => d.toISOString().slice(0, 10);

export class StreakService {
  /**
   * Update the login streak. Call on auth. Idempotent within a calendar day:
   * same day → noop; consecutive day → +1; gap → reset to 1.
   */
  async touch(userId: string): Promise<void> {
    const [u] = await db
      .select({ last: users.lastLoginDate, streak: users.loginStreak, longest: users.longestStreak })
      .from(users)
      .where(eq(users.id, userId));
    if (!u) return;

    const today = ymd(new Date());
    if (u.last === today) return; // already counted today

    const yd = new Date();
    yd.setUTCDate(yd.getUTCDate() - 1);
    const yesterday = ymd(yd);

    const streak = u.last === yesterday ? (u.streak ?? 0) + 1 : 1;
    const longest = Math.max(u.longest ?? 0, streak);

    await db
      .update(users)
      .set({ lastLoginDate: today, loginStreak: streak, longestStreak: longest })
      .where(eq(users.id, userId));
  }
}

export const streakService = new StreakService();
