import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export type LeaderboardRow = {
  id: string;
  name: string;
  avatar: string | null;
  tier: string;
  score: number;
  activity: number;
};

export class LeaderboardRepository {
  async byScore(limit: number): Promise<LeaderboardRow[]> {
    const res: any = await db.execute(sql`
      SELECT id, name, avatar, tier, score,
             0::int AS activity
      FROM users
      WHERE is_banned = false
      ORDER BY score DESC, created_at ASC
      LIMIT ${limit}
    `);
    const list: any[] = res.rows ?? res;
    return list.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      avatar: r.avatar ?? null,
      tier: String(r.tier),
      score: Number(r.score ?? 0),
      activity: Number(r.activity ?? 0),
    }));
  }

  async byWeekActivity(limit: number): Promise<LeaderboardRow[]> {
    const res: any = await db.execute(sql`
      SELECT u.id, u.name, u.avatar, u.tier, u.score,
        (
          (SELECT COUNT(*) FROM threads t WHERE t.author_id = u.id AND t.created_at >= NOW() - INTERVAL '7 days')
          + (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.created_at >= NOW() - INTERVAL '7 days')
        )::int AS activity
      FROM users u
      WHERE u.is_banned = false
      ORDER BY activity DESC, u.score DESC
      LIMIT ${limit}
    `);
    const list: any[] = res.rows ?? res;
    return list.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      avatar: r.avatar ?? null,
      tier: String(r.tier),
      score: Number(r.score ?? 0),
      activity: Number(r.activity ?? 0),
    }));
  }
}

export const leaderboardRepository = new LeaderboardRepository();
