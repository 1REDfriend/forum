import { Hono } from 'hono';
import { requireAdmin, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { adminRepository } from '../repositories/admin.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { reportService } from '../services/report.service.js';
import { badgeService } from '../services/badge.service.js';
import {
  AdminPagination,
  UpdateUserRoleDTO,
  UpdateUserTierDTO,
  ReportQuery,
  ReportStatusDTO,
  GrantBadgeDTO,
  CreateBadgeDTO,
  UpdateBadgeDTO,
  BanUserDTO,
} from '../types/index.js';

export const adminRoutes = new Hono<AuthEnv>()
  .use(requireAdmin)
  // ─── Stats & Activity ──────────────────────────────────────────────────
  .get('/stats', async (c) => c.json(await adminRepository.getSystemStats()))
  .get('/activity', async (c) => c.json(await adminRepository.getRecentActivity(20)))
  // ─── Users ─────────────────────────────────────────────────────────────
  .get('/users', validate('query', AdminPagination), async (c) => {
    const { page, limit, search } = c.req.valid('query');
    const result = await adminRepository.getAllUsers(page, limit, search);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .patch('/users/:id/role', validate('json', UpdateUserRoleDTO), async (c) => {
    // Prevent self-demotion
    if (c.req.param('id') === c.get('user').userId)
      return c.json({ error: 'Cannot change your own role' }, 400);
    const updated = await adminRepository.updateUserRole(c.req.param('id'), c.req.valid('json').role);
    if (!updated) return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
  })
  .patch('/users/:id/tier', validate('json', UpdateUserTierDTO), async (c) => {
    const updated = await adminRepository.updateUserTier(c.req.param('id'), c.req.valid('json').tier);
    if (!updated) return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
  })
  .delete('/users/:id', async (c) => {
    if (c.req.param('id') === c.get('user').userId)
      return c.json({ error: 'Cannot delete your own account via admin panel' }, 400);
    await adminRepository.deleteUser(c.req.param('id'));
    return c.body(null, 204);
  })
  .patch('/users/:id/ban', validate('json', BanUserDTO), async (c) => {
    if (c.req.param('id') === c.get('user').userId) return c.json({ error: 'Cannot ban yourself' }, 400);
    const updated = await adminRepository.banUser(
      c.req.param('id'),
      c.req.valid('json').reason,
      c.get('user').userId,
    );
    if (!updated) return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
  })
  .patch('/users/:id/unban', async (c) => {
    const updated = await adminRepository.unbanUser(c.req.param('id'));
    if (!updated) return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
  })
  // ─── Forums ────────────────────────────────────────────────────────────
  .get('/forums', validate('query', AdminPagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    const result = await adminRepository.getAllForumsAdmin(page, limit);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .delete('/forums/:id', async (c) => {
    await forumRepository.delete(c.req.param('id'));
    return c.body(null, 204);
  })
  // ─── Threads ───────────────────────────────────────────────────────────
  .get('/threads', validate('query', AdminPagination), async (c) => {
    const { page, limit, search } = c.req.valid('query');
    const result = await adminRepository.getAllThreadsAdmin(page, limit, search);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .delete('/threads/:id', async (c) => {
    await threadRepository.delete(c.req.param('id'));
    return c.body(null, 204);
  })
  // ─── Posts ─────────────────────────────────────────────────────────────
  .get('/posts', validate('query', AdminPagination), async (c) => {
    const { page, limit } = c.req.valid('query');
    const result = await adminRepository.getAllPostsAdmin(page, limit);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .delete('/posts/:id', async (c) => {
    await postRepository.delete(c.req.param('id'));
    return c.body(null, 204);
  })
  // ─── Reports ───────────────────────────────────────────────────────────
  .get('/reports', validate('query', ReportQuery), async (c) => {
    const { page, limit, status } = c.req.valid('query');
    const result = await reportService.list(page, limit, status);
    return c.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
  })
  .patch('/reports/:id', validate('json', ReportStatusDTO), async (c) =>
    c.json(await reportService.resolve(c.req.param('id'), c.req.valid('json').status)),
  )
  // ─── Badges ────────────────────────────────────────────────────────────
  .get('/badges', async (c) => c.json(await badgeService.catalog()))
  .post('/badges', validate('json', CreateBadgeDTO), async (c) => {
    const result = await badgeService.createDef(c.req.valid('json'));
    if (!result.ok) return c.json({ error: 'A badge with this key already exists' }, 409);
    return c.json(result.badge);
  })
  .put('/badges/:key', validate('json', UpdateBadgeDTO), async (c) => {
    // Zod's `.optional()` types the field as `T | undefined` (present-but-undefined
    // allowed); badgeService.updateDef's Partial<T> forbids that under
    // exactOptionalPropertyTypes. At runtime Zod omits absent keys rather than
    // setting them to undefined, so this cast is safe.
    const patch = c.req.valid('json') as Partial<{ label: string; description: string; icon: string }>;
    const updated = await badgeService.updateDef(c.req.param('key'), patch);
    if (!updated) return c.json({ error: 'Badge not found' }, 404);
    return c.json(updated);
  })
  .delete('/badges/:key', async (c) => {
    const removed = await badgeService.deleteDef(c.req.param('key'));
    if (!removed) return c.json({ error: 'Badge not found' }, 404);
    return c.body(null, 204);
  })
  .post('/users/:id/badges', validate('json', GrantBadgeDTO), async (c) => {
    const result = await badgeService.grant(c.req.param('id'), c.req.valid('json').badgeKey);
    if (!result.ok) {
      return result.reason === 'unknown'
        ? c.json({ error: 'Unknown badge' }, 400)
        : c.json({ error: 'User already has this badge' }, 409);
    }
    return c.json({ message: 'Badge granted' });
  })
  .delete('/users/:id/badges/:badgeKey', async (c) => {
    const removed = await badgeService.revoke(c.req.param('id'), c.req.param('badgeKey'));
    if (!removed) return c.json({ error: 'User does not have this badge' }, 404);
    return c.body(null, 204);
  });
