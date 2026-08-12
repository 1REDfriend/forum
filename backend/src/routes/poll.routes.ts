import { Hono } from 'hono';
import { z } from 'zod';
import { optionalAuth, requireAuth, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { pollService } from '../services/poll.service.js';

const VoteDTO = z.object({
  optionId: z.string().min(1),
});

export const pollRoutes = new Hono<OptionalAuthEnv>()
  .get('/thread/:threadId', optionalAuth, async (c) => {
    const poll = await pollService.getForThread(c.req.param('threadId'), c.get('user')?.userId);
    return c.json(poll);
  })
  .post('/:pollId/vote', requireAuth, validate('json', VoteDTO), async (c) =>
    c.json(
      await pollService.vote(c.get('user').userId, c.req.param('pollId'), c.req.valid('json').optionId),
    ),
  );
