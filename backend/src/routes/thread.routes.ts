import { Hono } from 'hono';
import { threadService } from '../services/thread.service.js';
import { requireAuth, optionalAuth, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { CreateThreadDTO, UpdateThreadDTO, Pagination } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const threadRoutes = new Hono<OptionalAuthEnv>()
  // Public routes with optional auth (so likes are personalized for logged-in users)
  .get('/', optionalAuth, async (c) => c.json(await threadService.getAllThreads()))
  .get('/forum/:forumId', optionalAuth, validate('query', Pagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    return c.json(
      await threadService.getThreadsByForumId(c.req.param('forumId'), page, limit, c.get('user')?.userId),
    );
  })
  .get('/:id', optionalAuth, async (c) =>
    c.json(await threadService.getThreadById(c.req.param('id'), c.get('user')?.userId)),
  )
  // Protected routes
  .post('/', requireAuth, validate('json', CreateThreadDTO), async (c) =>
    c.json(await threadService.createThread(c.get('user')!.userId, c.req.valid('json')), 201),
  )
  .put('/:id', requireAuth, validate('json', UpdateThreadDTO), async (c) => {
    const body = c.req.valid('json');
    if (Object.keys(body).length === 0)
      throw BadRequestError('At least one field (title or content) must be provided');
    return c.json(await threadService.updateThread(c.get('user')!.userId, c.req.param('id'), body));
  })
  .delete('/:id', requireAuth, async (c) => {
    await threadService.deleteThread(c.get('user')!.userId, c.req.param('id'));
    return c.body(null, 204);
  })
  .patch('/:id/pin', requireAuth, async (c) =>
    c.json(await threadService.pinThread(c.get('user')!.userId, c.req.param('id'))),
  )
  .patch('/:id/lock', requireAuth, async (c) =>
    c.json(await threadService.lockThread(c.get('user')!.userId, c.req.param('id'))),
  );
