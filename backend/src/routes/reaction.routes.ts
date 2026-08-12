import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { reactionService } from '../services/reaction.service.js';

// Emoji graphemes can be multi-code-unit (e.g. ❤️); allow a bit of room.
const ToggleDTO = z.object({
  emoji: z.string().min(1).max(16),
  threadId: z.string().min(1).optional(),
  postId: z.string().min(1).optional(),
});

export const reactionRoutes = new Hono<AuthEnv>()
  .post('/', requireAuth, validate('json', ToggleDTO), async (c) =>
    c.json(await reactionService.toggle(c.get('user').userId, c.req.valid('json'))),
  );
