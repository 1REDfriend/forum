import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { notificationService } from '../services/notification.service.js';

const MarkReadDTO = z
  .object({
    ids: z.array(z.string().min(1)).optional(),
    all: z.boolean().optional(),
  })
  .refine((b) => b.all === true || (Array.isArray(b.ids) && b.ids.length > 0), {
    message: 'Provide { all: true } or a non-empty ids array',
  });

export const notificationRoutes = new Hono<AuthEnv>()
  .use('*', requireAuth)
  .get('/', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);
    const userId = c.get('user').userId;
    return c.json(
      await notificationService.list(
        userId,
        Number.isFinite(page) ? page : 1,
        Number.isFinite(limit) ? limit : 20,
      ),
    );
  })
  .get('/unread-count', async (c) => {
    return c.json(await notificationService.unreadCount(c.get('user').userId));
  })
  .post('/read', validate('json', MarkReadDTO), async (c) => {
    const body = c.req.valid('json');
    return c.json(await notificationService.markRead(c.get('user').userId, body));
  });
