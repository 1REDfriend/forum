import { leaderboardRepository } from '../repositories/leaderboard.repository.js';

export class LeaderboardService {
  async get(period: 'week' | 'all' = 'week', limitRaw = 20) {
    const limit = Math.min(50, Math.max(1, Math.floor(limitRaw) || 20));
    const rows =
      period === 'all'
        ? await leaderboardRepository.byScore(limit)
        : await leaderboardRepository.byWeekActivity(limit);

    return {
      period,
      items: rows.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        tier: r.tier,
        score: r.score,
        activity: r.activity,
        stat: period === 'all' ? r.score : r.activity,
      })),
    };
  }
}

export const leaderboardService = new LeaderboardService();
