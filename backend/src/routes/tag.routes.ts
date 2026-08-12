import { Hono } from 'hono';
import { tagRepository } from '../repositories/tag.repository.js';

export const tagRoutes = new Hono()
  .get('/', async (c) => {
    const q = c.req.query('q') ?? '';
    return c.json({ tags: await tagRepository.search(q, 30) });
  });
