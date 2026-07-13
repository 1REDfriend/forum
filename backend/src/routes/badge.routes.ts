import { Hono } from 'hono';
import { badgeService } from '../services/badge.service.js';

// Public, unauthenticated badge catalog so normal users can discover badges.
// (Admin manage flows stay under /admin/* with the admin guard.)
export const badgeRoutes = new Hono().get('/catalog', async (c) => c.json(await badgeService.catalog()));
