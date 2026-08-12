import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { eventService } from '../services/event.service.js';

const CreateEventDTO = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
});

export const eventRoutes = new Hono<OptionalAuthEnv>()
  .get('/', async (c) =>
    c.json({
      events: await eventService.list(c.req.query('from') ?? undefined, c.req.query('to') ?? undefined),
    }),
  )
  .post('/', requireAuth, validate('json', CreateEventDTO), async (c) =>
    c.json(await eventService.create(c.get('user').userId, c.req.valid('json')), 201),
  )
  .delete('/:id', requireAuth, async (c) => {
    await eventService.remove(c.get('user').userId, c.req.param('id'));
    return c.body(null, 204);
  });
