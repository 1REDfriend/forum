import { Elysia } from 'elysia';
import { forumService } from '../services/forum.service.js';
import { auth } from '../http/auth.js';
import { CreateForumDTO, UpdateForumDTO, IdParam } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const forumRoutes = new Elysia({ prefix: '/forums', tags: ['Forums'] })
  .use(auth)
  .get('/', () => forumService.getAllForums())
  .get('/:id', ({ params }) => forumService.getForumById(params.id), { params: IdParam })
  .guard({ auth: true }, (app) =>
    app
      .post(
        '/',
        ({ user, body, set }) => {
          set.status = 201;
          return forumService.createForum(user.userId, body);
        },
        { body: CreateForumDTO },
      )
      .put(
        '/:id',
        ({ user, params, body }) => {
          if (Object.keys(body).length === 0)
            throw BadRequestError('At least one field (name or description) must be provided');
          return forumService.updateForum(user.userId, params.id, body);
        },
        { params: IdParam, body: UpdateForumDTO },
      )
      .delete(
        '/:id',
        async ({ user, params }) => {
          await forumService.deleteForum(user.userId, params.id);
          return new Response(null, { status: 204 });
        },
        { params: IdParam },
      ),
  );
