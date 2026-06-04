import { Elysia } from 'elysia';
import { userService } from '../services/user.service.js';
import { auth } from '../http/auth.js';
import { UpdateUserDTO, IdParam } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const userRoutes = new Elysia({ prefix: '/users', tags: ['Users'] })
  .use(auth)
  // Protected routes (defined before /:id so 'me' isn't captured as an id param)
  .get('/me', ({ user }) => userService.getProfile(user.userId), { auth: true })
  .put(
    '/me',
    ({ user, body }) => {
      if (Object.keys(body).length === 0) throw BadRequestError('At least one field must be provided');
      return userService.updateProfile(user.userId, body);
    },
    { auth: true, body: UpdateUserDTO },
  )
  // Public route
  .get('/:id', ({ params }) => userService.getPublicProfile(params.id), { params: IdParam });
