import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { dmService } from '../services/dm.service.js';

const OpenDTO = z.object({ userId: z.string().min(1) });
const SendDTO = z.object({ body: z.string().min(1).max(5000) });

export const dmRoutes = new Hono<AuthEnv>()
  .use('*', requireAuth)
  .get('/', async (c) => c.json({ conversations: await dmService.list(c.get('user').userId) }))
  .get('/unread-count', async (c) => c.json(await dmService.unreadCount(c.get('user').userId)))
  .post('/open', validate('json', OpenDTO), async (c) =>
    c.json(await dmService.open(c.get('user').userId, c.req.valid('json').userId), 201),
  )
  .get('/:id/messages', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);
    return c.json(
      await dmService.messages(
        c.get('user').userId,
        c.req.param('id'),
        Number.isFinite(page) ? page : 1,
        Number.isFinite(limit) ? limit : 50,
      ),
    );
  })
  .post('/:id/messages', validate('json', SendDTO), async (c) =>
    c.json(
      await dmService.send(c.get('user').userId, c.req.param('id'), c.req.valid('json').body),
      201,
    ),
  );
