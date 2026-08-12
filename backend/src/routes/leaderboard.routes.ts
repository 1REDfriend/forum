import { Hono } from 'hono';
import { leaderboardService } from '../services/leaderboard.service.js';

export const leaderboardRoutes = new Hono().get('/', async (c) => {
  const periodRaw = c.req.query('period') ?? 'week';
  const period = periodRaw === 'all' ? 'all' : 'week';
  const limit = Number(c.req.query('limit') ?? 20);
  return c.json(await leaderboardService.get(period, Number.isFinite(limit) ? limit : 20));
});
