import { Hono } from 'hono';
import { z } from 'zod';
import { threadService } from '../services/thread.service.js';
import { requireAuth, optionalAuth, type OptionalAuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { CreateThreadDTO, UpdateThreadDTO, Pagination } from '../types/index.js';
import { BadRequestError } from '../utils/errors.js';
import { createThreadRateLimit } from '../http/rateLimit.js';

const MarkReadDTO = z.object({
  at: z.string().datetime().optional(),
});

export const threadRoutes = new Hono<OptionalAuthEnv>()
  // Public routes with optional auth (so likes are personalized for logged-in users)
  .get('/', optionalAuth, async (c) => c.json(await threadService.getAllThreads()))
  .get('/forum/:forumId', optionalAuth, validate('query', Pagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    const sortRaw = c.req.query('sort') ?? 'newest';
    const filterRaw = c.req.query('filter') ?? 'all';
    const sort = (['newest', 'recent_activity', 'most_liked', 'unanswered'] as const).includes(
      sortRaw as 'newest',
    )
      ? (sortRaw as 'newest' | 'recent_activity' | 'most_liked' | 'unanswered')
      : 'newest';
    const filter = (['all', 'mine', 'pinned'] as const).includes(filterRaw as 'all')
      ? (filterRaw as 'all' | 'mine' | 'pinned')
      : 'all';
    const result = await threadService.getThreadsByForumId(
      c.req.param('forumId'),
      page,
      limit,
      c.get('user')?.userId,
      sort,
      filter,
    );
    const tagSlug = c.req.query('tag');
    if (tagSlug) {
      const { tagRepository } = await import('../repositories/tag.repository.js');
      const ids = new Set(await tagRepository.findThreadIdsBySlug(tagSlug));
      result.data = result.data.filter((t: { id: string }) => ids.has(t.id));
      result.total = result.data.length;
      result.totalPages = Math.ceil(result.total / limit) || 1;
    }
    return c.json(result);
  })
  .get('/:id', optionalAuth, async (c) =>
    c.json(await threadService.getThreadById(c.req.param('id'), c.get('user')?.userId)),
  )
  // Protected routes
  .post('/:id/read', requireAuth, async (c) => {
    let at: Date | undefined;
    try {
      const body = await c.req.json().catch(() => ({}));
      const parsed = MarkReadDTO.safeParse(body ?? {});
      if (parsed.success && parsed.data.at) at = new Date(parsed.data.at);
    } catch {
      /* empty body ok */
    }
    return c.json(await threadService.markRead(c.get('user').userId, c.req.param('id'), at));
  })
  .post('/', requireAuth, createThreadRateLimit, validate('json', CreateThreadDTO), async (c) =>
    c.json(await threadService.createThread(c.get('user').userId, c.req.valid('json')), 201),
  )
  .put('/:id', requireAuth, validate('json', UpdateThreadDTO), async (c) => {
    const body = c.req.valid('json');
    if (Object.keys(body).length === 0)
      throw BadRequestError('At least one field (title or content) must be provided');
    return c.json(await threadService.updateThread(c.get('user').userId, c.req.param('id'), body));
  })
  .delete('/:id', requireAuth, async (c) => {
    await threadService.deleteThread(c.get('user').userId, c.req.param('id'));
    return c.body(null, 204);
  })
  .patch('/:id/pin', requireAuth, async (c) =>
    c.json(await threadService.pinThread(c.get('user').userId, c.req.param('id'))),
  )
  .patch('/:id/lock', requireAuth, async (c) =>
    c.json(await threadService.lockThread(c.get('user').userId, c.req.param('id'))),
  )
  .get('/:id/watch', requireAuth, async (c) =>
    c.json(await threadService.isWatching(c.get('user').userId, c.req.param('id'))),
  )
  .post('/:id/watch', requireAuth, async (c) =>
    c.json(await threadService.setWatch(c.get('user').userId, c.req.param('id'), true)),
  )
  .delete('/:id/watch', requireAuth, async (c) => {
    await threadService.setWatch(c.get('user').userId, c.req.param('id'), false);
    return c.json({ watching: false });
  });
