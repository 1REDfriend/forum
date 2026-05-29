import type { Request, Response, NextFunction } from 'express';
import { adminRepository } from '../repositories/admin.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { z } from 'zod';

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export class AdminController {
  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminRepository.getSystemStats();
      res.json(stats);
    } catch (error) { next(error); }
  }

  async getRecentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const activity = await adminRepository.getRecentActivity(20);
      res.json(activity);
    } catch (error) { next(error); }
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = PaginationSchema.parse(req.query);
      const result = await adminRepository.getAllUsers(page, limit, search);
      res.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
    } catch (error) { next(error); }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid user ID' }); return; }

      // Prevent self-demotion
      if (id === req.user!.userId) {
        res.status(400).json({ error: 'Cannot change your own role' });
        return;
      }

      const { role } = z.object({ role: z.enum(['user', 'admin']) }).parse(req.body);
      const user = await adminRepository.updateUserRole(id, role);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.json(user);
    } catch (error) { next(error); }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid user ID' }); return; }

      if (id === req.user!.userId) {
        res.status(400).json({ error: 'Cannot delete your own account via admin panel' });
        return;
      }

      await adminRepository.deleteUser(id);
      res.status(204).send();
    } catch (error) { next(error); }
  }

  // ─── Forums ─────────────────────────────────────────────────────────────────

  async getForums(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = PaginationSchema.parse(req.query);
      const result = await adminRepository.getAllForumsAdmin(page, limit);
      res.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
    } catch (error) { next(error); }
  }

  async deleteForum(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid forum ID' }); return; }
      await forumRepository.delete(id);
      res.status(204).send();
    } catch (error) { next(error); }
  }

  // ─── Threads ────────────────────────────────────────────────────────────────

  async getThreads(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = PaginationSchema.parse(req.query);
      const result = await adminRepository.getAllThreadsAdmin(page, limit, search);
      res.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
    } catch (error) { next(error); }
  }

  async deleteThread(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid thread ID' }); return; }
      await threadRepository.delete(id);
      res.status(204).send();
    } catch (error) { next(error); }
  }

  // ─── Posts ──────────────────────────────────────────────────────────────────

  async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = PaginationSchema.parse(req.query);
      const result = await adminRepository.getAllPostsAdmin(page, limit);
      res.json({ ...result, page, limit, totalPages: Math.ceil(result.total / limit) });
    } catch (error) { next(error); }
  }

  async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid post ID' }); return; }
      await postRepository.delete(id);
      res.status(204).send();
    } catch (error) { next(error); }
  }
}

export const adminController = new AdminController();
