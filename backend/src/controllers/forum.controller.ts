import type { Request, Response, NextFunction } from 'express';
import { forumService } from '../services/forum.service.js';
import { CreateForumDTOSchema, UpdateForumDTOSchema } from '../types/index.js';

export class ForumController {
  async getAllForums(req: Request, res: Response, next: NextFunction) {
    try {
      const forums = await forumService.getAllForums();
      res.status(200).json(forums);
    } catch (error) {
      next(error);
    }
  }

  async getForumById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid forum ID' });
        return;
      }
      const forum = await forumService.getForumById(id);
      res.status(200).json(forum);
    } catch (error) {
      next(error);
    }
  }

  async createForum(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = CreateForumDTOSchema.parse(req.body);
      const forum = await forumService.createForum(userId, data);
      res.status(201).json(forum);
    } catch (error) {
      next(error);
    }
  }

  async updateForum(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid forum ID' });
        return;
      }
      const data = UpdateForumDTOSchema.parse(req.body);
      const forum = await forumService.updateForum(userId, id, data);
      res.status(200).json(forum);
    } catch (error) {
      next(error);
    }
  }

  async deleteForum(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid forum ID' });
        return;
      }
      await forumService.deleteForum(userId, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const forumController = new ForumController();
