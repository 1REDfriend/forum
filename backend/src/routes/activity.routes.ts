import { Hono } from 'hono';
import { activityService } from '../services/activity.service.js';

export const activityRoutes = new Hono().get('/recent', async (c) => {
  const raw = c.req.query('limit');
  const limit = raw === undefined || raw === '' ? 20 : Number(raw);
  return c.json(await activityService.getRecent(Number.isFinite(limit) ? limit : 20));
});

export const statsRoutes = new Hono().get('/public', async (c) =>
  c.json(await activityService.getPublicStats()),
);
