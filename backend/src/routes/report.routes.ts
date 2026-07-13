import { Hono } from 'hono';
import { reportService } from '../services/report.service.js';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { ReportDTO } from '../types/index.js';

export const reportRoutes = new Hono<AuthEnv>().post(
  '/',
  requireAuth,
  validate('json', ReportDTO),
  async (c) => c.json(await reportService.create(c.get('user').userId, c.req.valid('json'))),
);
