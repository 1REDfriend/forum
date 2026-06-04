import { Elysia } from 'elysia';
import { likeService } from '../services/like.service.js';
import { auth } from '../http/auth.js';
import { IdParam } from '../types/index.js';

export const likeRoutes = new Elysia({ prefix: '/likes', tags: ['Likes'] })
  .use(auth)
  .guard({ auth: true }, (app) =>
    app
      .post('/thread/:id', ({ user, params }) => likeService.toggleThreadLike(user.userId, params.id), {
        params: IdParam,
      })
      .post('/post/:id', ({ user, params }) => likeService.togglePostLike(user.userId, params.id), {
        params: IdParam,
      }),
  );
