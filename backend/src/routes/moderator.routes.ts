import { Hono } from 'hono';
import { z } from 'zod';
import { requireRole, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { moderatorRepository } from '../repositories/moderator.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

const AddDTO = z.object({ userId: z.string().min(1) });

export const moderatorRoutes = new Hono<AuthEnv>()
  .get('/forum/:forumId', async (c) =>
    c.json({ moderators: await moderatorRepository.listForForum(c.req.param('forumId')) }),
  )
  .post(
    '/forum/:forumId',
    requireRole('admin', 'manager'),
    validate('json', AddDTO),
    async (c) => {
      const forumId = c.req.param('forumId');
      const forum = await forumRepository.findById(forumId);
      if (!forum) throw NotFoundError('Forum not found');
      const { userId } = c.req.valid('json');
      const u = await userRepository.findById(userId);
      if (!u) throw BadRequestError('User not found');
      await moderatorRepository.add(forumId, userId);
      return c.json({ ok: true }, 201);
    },
  )
  .delete('/forum/:forumId/:userId', requireRole('admin', 'manager'), async (c) => {
    await moderatorRepository.remove(c.req.param('forumId'), c.req.param('userId'));
    return c.body(null, 204);
  });
