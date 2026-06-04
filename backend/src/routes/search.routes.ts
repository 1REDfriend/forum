import { Elysia, t } from 'elysia';
import { searchRepository } from '../repositories/search.repository.js';

export const searchRoutes = new Elysia({ prefix: '/search', tags: ['Search'] }).get(
  '/',
  ({ query }) => {
    const q = (query.q ?? '').trim();
    if (!q) return { forums: [], threads: [] };
    return searchRepository.search(q);
  },
  { query: t.Object({ q: t.Optional(t.String()) }) },
);
