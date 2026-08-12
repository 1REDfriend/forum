import { Hono } from 'hono';
import { requireRole, type AuthEnv } from '../http/auth.js';
import { digestService } from '../services/digest.service.js';

/** Admin-triggered weekly digest (cron can hit this with admin token). */
export const digestRoutes = new Hono<AuthEnv>().post(
  '/weekly',
  requireRole('admin'),
  async (c) => c.json(await digestService.sendWeekly()),
);
