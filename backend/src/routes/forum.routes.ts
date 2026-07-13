import { Hono } from 'hono';
import { forumService } from '../services/forum.service.js';
import { requireAuth, requireAdmin, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { CreateForumDTO, UpdateForumDTO } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const forumRoutes = new Hono<OptionalAuthEnv>()
  .get('/', async (c) => c.json(await forumService.getAllForums()))
  .get('/:id', async (c) => c.json(await forumService.getForumById(c.req.param('id'))))
  .post('/', requireAdmin, validate('json', CreateForumDTO), async (c) =>
    c.json(await forumService.createForum(c.get('user')!.userId, c.req.valid('json')), 201),
  )
  .put('/:id', requireAuth, validate('json', UpdateForumDTO), async (c) => {
    const body = c.req.valid('json');
    if (Object.keys(body).length === 0)
      throw BadRequestError('At least one field (name or description) must be provided');
    return c.json(await forumService.updateForum(c.get('user')!.userId, c.req.param('id'), body));
  })
  .delete('/:id', requireAuth, async (c) => {
    await forumService.deleteForum(c.get('user')!.userId, c.req.param('id'));
    return c.body(null, 204);
  });
