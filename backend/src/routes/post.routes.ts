import { Hono } from 'hono';
import { postService } from '../services/post.service.js';
import { requireAuth, optionalAuth, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { CreatePostDTO, UpdatePostDTO, Pagination } from '../types/index.js';

export const postRoutes = new Hono<OptionalAuthEnv>()
  // Get posts for a thread — optional auth so isLikedByMe is populated for logged-in users
  .get('/thread/:threadId', optionalAuth, validate('query', Pagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    return c.json(
      await postService.getPostsByThreadId(c.req.param('threadId'), page, limit, c.get('user')?.userId),
    );
  })
  // Protected routes
  .post('/', requireAuth, validate('json', CreatePostDTO), async (c) =>
    c.json(await postService.createPost(c.get('user').userId, c.req.valid('json')), 201),
  )
  .put('/:id', requireAuth, validate('json', UpdatePostDTO), async (c) =>
    c.json(await postService.updatePost(c.get('user').userId, c.req.param('id'), c.req.valid('json'))),
  )
  .delete('/:id', requireAuth, async (c) => {
    await postService.deletePost(c.get('user').userId, c.req.param('id'));
    return c.body(null, 204);
  });
