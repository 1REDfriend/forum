import { Elysia } from 'elysia';
import { reportService } from '../services/report.service.js';
import { auth } from '../http/auth.js';
import { ReportDTO } from '../types/index.js';

export const reportRoutes = new Elysia({ prefix: '/reports', tags: ['Reports'] })
  .use(auth)
  .guard({ auth: true }, (app) =>
    app.post('/', ({ user, body }) => reportService.create(user.userId, body), { body: ReportDTO }),
  );
