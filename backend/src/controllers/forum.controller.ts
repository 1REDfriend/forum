import type { Request, Response, NextFunction } from 'express';
import { forumService } from '../services/forum.service.js';
import { CreateForumDTOSchema } from '../types/index.js';

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
      // Typically only admins can create forums, but we'll leave it open or just check auth for now
      const data = CreateForumDTOSchema.parse(req.body);
      const forum = await forumService.createForum(data);
      res.status(201).json(forum);
    } catch (error) {
      next(error);
    }
  }
}

export const forumController = new ForumController();
