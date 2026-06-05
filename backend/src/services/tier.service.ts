import { sql, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { tierForScore, tierIndex, tierProgress } from '../domain/tiers.js';

export interface UserStats {
  threads: number;
  posts: number;
  likesReceived: number;
  accountAgeDays: number;
  loginStreak: number;
  longestStreak: number;
  reports: number;
}

export class TierService {
  /** All score inputs for a user, in one round-trip. */
  async computeStats(userId: number): Promise<UserStats> {
    const res: any = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM threads WHERE author_id = ${userId})::int AS threads,
        (SELECT COUNT(*) FROM posts WHERE author_id = ${userId})::int AS posts,
        (
          (SELECT COUNT(*) FROM likes l JOIN threads t ON l.thread_id = t.id WHERE t.author_id = ${userId})
          + (SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.author_id = ${userId})
        )::int AS likes_received,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - (SELECT created_at FROM users WHERE id = ${userId}))) / 86400)::int AS age_days,
        COALESCE((SELECT login_streak FROM users WHERE id = ${userId}), 0)::int AS login_streak,
        COALESCE((SELECT longest_streak FROM users WHERE id = ${userId}), 0)::int AS longest_streak,
        (SELECT COUNT(*) FROM reports r WHERE r.status <> 'dismissed' AND (
              (r.target_type = 'user' AND r.target_id = ${userId})
           OR (r.target_type = 'thread' AND r.target_id IN (SELECT id FROM threads WHERE author_id = ${userId}))
           OR (r.target_type = 'post' AND r.target_id IN (SELECT id FROM posts WHERE author_id = ${userId}))
        ))::int AS reports
    `);
    const row = (res.rows ?? res)[0] ?? {};
    return {
      threads: Number(row.threads ?? 0),
      posts: Number(row.posts ?? 0),
      likesReceived: Number(row.likes_received ?? 0),
      accountAgeDays: Number(row.age_days ?? 0),
      loginStreak: Number(row.login_streak ?? 0),
      longestStreak: Number(row.longest_streak ?? 0),
      reports: Number(row.reports ?? 0),
    };
  }

  /** Weighted score (see plan). Posts/likes ×3, age ×2/month, streak ×1, reports −10. */
  scoreFor(s: UserStats): number {
    const score =
      3 * (s.threads + s.posts) +
      3 * s.likesReceived +
      2 * Math.floor(s.accountAgeDays / 30) +
      s.loginStreak -
      10 * s.reports;
    return Math.max(0, score);
  }

  /**
   * Recompute + persist score, bump the stored tier monotonically (never down),
   * and return the full tier/progress payload for a profile response.
   */
  async sync(userId: number, storedTier: string) {
    const stats = await this.computeStats(userId);
    const score = this.scoreFor(stats);
    const candidate = tierForScore(score);
    const tier = tierIndex(candidate.key) > tierIndex(storedTier) ? candidate.key : storedTier;

    await db.update(users).set({ score, tier, tierUpdatedAt: new Date() }).where(eq(users.id, userId));

    const prog = tierProgress(score, tier);
    return { score, tier, stats, ...prog };
  }
}

export const tierService = new TierService();
