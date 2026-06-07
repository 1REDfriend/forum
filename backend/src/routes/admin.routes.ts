import { Elysia, status } from 'elysia';
import { auth } from '../http/auth.js';
import { adminRepository } from '../repositories/admin.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { reportService } from '../services/report.service.js';
import { badgeService } from '../services/badge.service.js';
import {
  AdminPagination,
  IdParam,
  UpdateUserRoleDTO,
  UpdateUserTierDTO,
  ReportQuery,
  ReportStatusDTO,
  GrantBadgeDTO,
  BadgeParam,
} from '../types/index.js';

export const adminRoutes = new Elysia({ prefix: '/admin', tags: ['Admin'] })
  .use(auth)
  // All admin routes require authentication + admin role
  .guard({ admin: true }, (app) =>
    app
      // ─── Stats & Activity ──────────────────────────────────────────────────
      .get('/stats', () => adminRepository.getSystemStats())
      .get('/activity', () => adminRepository.getRecentActivity(20))
      // ─── Users ─────────────────────────────────────────────────────────────
      .get(
        '/users',
        async ({ query }) => {
          const { page, limit, search } = query;
          const result = await adminRepository.getAllUsers(page, limit, search);
          return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
        },
        { query: AdminPagination },
      )
      .patch(
        '/users/:id/role',
        async ({ user, params, body }) => {
          // Prevent self-demotion
          if (params.id === user.userId) return status(400, { error: 'Cannot change your own role' });
          const updated = await adminRepository.updateUserRole(params.id, body.role);
          if (!updated) return status(404, { error: 'User not found' });
          return updated;
        },
        { params: IdParam, body: UpdateUserRoleDTO },
      )
      .patch(
        '/users/:id/tier',
        async ({ params, body }) => {
          const updated = await adminRepository.updateUserTier(params.id, body.tier);
          if (!updated) return status(404, { error: 'User not found' });
          return updated;
        },
        { params: IdParam, body: UpdateUserTierDTO },
      )
      .delete(
        '/users/:id',
        async ({ user, params }) => {
          if (params.id === user.userId)
            return status(400, { error: 'Cannot delete your own account via admin panel' });
          await adminRepository.deleteUser(params.id);
          return new Response(null, { status: 204 });
        },
        { params: IdParam },
      )
      // ─── Forums ────────────────────────────────────────────────────────────
      .get(
        '/forums',
        async ({ query }) => {
          const { page, limit } = query;
          const result = await adminRepository.getAllForumsAdmin(page, limit);
          return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
        },
        { query: AdminPagination },
      )
      .delete(
        '/forums/:id',
        async ({ params }) => {
          await forumRepository.delete(params.id);
          return new Response(null, { status: 204 });
        },
        { params: IdParam },
      )
      // ─── Threads ───────────────────────────────────────────────────────────
      .get(
        '/threads',
        async ({ query }) => {
          const { page, limit, search } = query;
          const result = await adminRepository.getAllThreadsAdmin(page, limit, search);
          return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
        },
        { query: AdminPagination },
      )
      .delete(
        '/threads/:id',
        async ({ params }) => {
          await threadRepository.delete(params.id);
          return new Response(null, { status: 204 });
        },
        { params: IdParam },
      )
      // ─── Posts ─────────────────────────────────────────────────────────────
      .get(
        '/posts',
        async ({ query }) => {
          const { page, limit } = query;
          const result = await adminRepository.getAllPostsAdmin(page, limit);
          return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
        },
        { query: AdminPagination },
      )
      .delete(
        '/posts/:id',
        async ({ params }) => {
          await postRepository.delete(params.id);
          return new Response(null, { status: 204 });
        },
        { params: IdParam },
      )
      // ─── Reports ───────────────────────────────────────────────────────────
      .get(
        '/reports',
        async ({ query }) => {
          const { page, limit, status } = query;
          const result = await reportService.list(page, limit, status);
          return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) };
        },
        { query: ReportQuery },
      )
      .patch(
        '/reports/:id',
        ({ params, body }) => reportService.resolve(params.id, body.status),
        { params: IdParam, body: ReportStatusDTO },
      )
      // ─── Badges ────────────────────────────────────────────────────────────
      .get('/badges', () => badgeService.catalog())
      .post(
        '/users/:id/badges',
        async ({ params, body }) => {
          const result = await badgeService.grant(params.id, body.badgeKey);
          if (!result.ok) {
            return result.reason === 'unknown'
              ? status(400, { error: 'Unknown badge' })
              : status(409, { error: 'User already has this badge' });
          }
          return { message: 'Badge granted' };
        },
        { params: IdParam, body: GrantBadgeDTO },
      )
      .delete(
        '/users/:id/badges/:badgeKey',
        async ({ params }) => {
          const removed = await badgeService.revoke(params.id, params.badgeKey);
          if (!removed) return status(404, { error: 'User does not have this badge' });
          return new Response(null, { status: 204 });
        },
        { params: BadgeParam },
      ),
  );
