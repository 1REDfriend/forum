import { Elysia, t } from 'elysia';
import { postService } from '../services/post.service.js';
import { auth } from '../http/auth.js';
import { CreatePostDTO, UpdatePostDTO, Pagination, IdParam } from '../types/index.js';

export const postRoutes = new Elysia({ prefix: '/posts', tags: ['Posts'] })
  .use(auth)
  // Get posts for a thread — optional auth so isLikedByMe is populated for logged-in users
  .get(
    '/thread/:threadId',
    ({ params, query, user }) =>
      postService.getPostsByThreadId(params.threadId, query.page, query.limit, user?.userId),
    { params: t.Object({ threadId: t.String({ minLength: 1 }) }), query: Pagination, optionalAuth: true },
  )
  // Protected routes
  .guard({ auth: true }, (app) =>
    app
      .post(
        '/',
        ({ user, body, set }) => {
          set.status = 201;
          return postService.createPost(user.userId, body);
        },
        { body: CreatePostDTO },
      )
      .put('/:id', ({ user, params, body }) => postService.updatePost(user.userId, params.id, body), {
        params: IdParam,
        body: UpdatePostDTO,
      })
      .delete(
        '/:id',
        async ({ user, params }) => {
          await postService.deletePost(user.userId, params.id);
          return new Response(null, { status: 204 });
        },
        { params: IdParam },
      ),
  );
