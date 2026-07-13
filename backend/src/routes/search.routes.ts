import { Hono } from 'hono';
import { searchRepository } from '../repositories/search.repository.js';

export const searchRoutes = new Hono().get('/', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  if (!q) return c.json({ forums: [], threads: [] });
  return c.json(await searchRepository.search(q));
});
