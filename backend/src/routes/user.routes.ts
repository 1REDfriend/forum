import { Hono } from 'hono';
import { userService } from '../services/user.service.js';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { UpdateUserDTO } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';

export const userRoutes = new Hono<AuthEnv>()
  // Protected routes (defined before /:id so 'me' isn't captured as an id param)
  .get('/me', requireAuth, async (c) => c.json(await userService.getProfile(c.get('user').userId)))
  .put('/me', requireAuth, validate('json', UpdateUserDTO), async (c) => {
    const body = c.req.valid('json');
    if (Object.keys(body).length === 0) throw BadRequestError('At least one field must be provided');
    return c.json(await userService.updateProfile(c.get('user').userId, body));
  })
  // Public route
  .get('/:id', async (c) => c.json(await userService.getPublicProfile(c.req.param('id'))));
