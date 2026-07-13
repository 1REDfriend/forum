import { Hono } from 'hono';
import { likeService } from '../services/like.service.js';
import { requireAuth, type AuthEnv } from '../http/auth.js';

export const likeRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post('/thread/:id', async (c) =>
    c.json(await likeService.toggleThreadLike(c.get('user').userId, c.req.param('id'))),
  )
  .post('/post/:id', async (c) =>
    c.json(await likeService.togglePostLike(c.get('user').userId, c.req.param('id'))),
  );
