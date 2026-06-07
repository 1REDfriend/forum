import { Elysia } from 'elysia';
import { badgeService } from '../services/badge.service.js';

// Public, unauthenticated badge catalog so normal users can discover badges.
// (Admin manage flows stay under /admin/* with the admin guard.)
export const badgeRoutes = new Elysia({ prefix: '/badges', tags: ['Badges'] })
  .get('/catalog', () => badgeService.catalog());
