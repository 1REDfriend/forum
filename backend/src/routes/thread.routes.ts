import { Elysia, t } from 'elysia';
import { threadService } from '../services/thread.service.js';
import { auth } from '../http/auth.js';
import { CreateThreadDTO, UpdateThreadDTO, Pagination, IdParam } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const threadRoutes = new Elysia({ prefix: '/threads', tags: ['Threads'] })
  .use(auth)
  // Public routes with optional auth (so likes are personalized for logged-in users)
  .get('/', () => threadService.getAllThreads(), { optionalAuth: true })
  .get(
    '/forum/:forumId',
    ({ params, query, user }) =>
      threadService.getThreadsByForumId(params.forumId, query.page, query.limit, user?.userId),
    { params: t.Object({ forumId: t.Numeric() }), query: Pagination, optionalAuth: true },
  )
  .get('/:id', ({ params, user }) => threadService.getThreadById(params.id, user?.userId), {
    params: IdParam,
    optionalAuth: true,
  })
  // Protected routes
  .guard({ auth: true }, (app) =>
    app
      .post(
        '/',
        ({ user, body, set }) => {
          set.status = 201;
          return threadService.createThread(user.userId, body);
        },
        { body: CreateThreadDTO },
      )
      .put(
        '/:id',
        ({ user, params, body }) => {
          if (Object.keys(body).length === 0)
            throw BadRequestError('At least one field (title or content) must be provided');
          return threadService.updateThread(user.userId, params.id, body);
        },
        { params: IdParam, body: UpdateThreadDTO },
      )
      .delete(
        '/:id',
        async ({ user, params }) => {
          await threadService.deleteThread(user.userId, params.id);
          return new Response(null, { status: 204 });
        },
        { params: IdParam },
      )
      .patch('/:id/pin', ({ user, params }) => threadService.pinThread(user.userId, params.id), {
        params: IdParam,
      })
      .patch('/:id/lock', ({ user, params }) => threadService.lockThread(user.userId, params.id), {
        params: IdParam,
      }),
  );
