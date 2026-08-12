import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { reactionService } from '../services/reaction.service.js';

const ToggleDTO = z.object({
  emoji: z.string().min(1).max(8),
  threadId: z.string().optional(),
  postId: z.string().optional(),
});

export const reactionRoutes = new Hono<AuthEnv>()
  .post('/', requireAuth, validate('json', ToggleDTO), async (c) =>
    c.json(await reactionService.toggle(c.get('user').userId, c.req.valid('json'))),
  );
