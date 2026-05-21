import type { Request, Response, NextFunction } from 'express';
import { threadService } from '../services/thread.service.js';
import { CreateThreadDTOSchema } from '../types/index.js';

export class ThreadController {
  async getAllThreads(req: Request, res: Response, next: NextFunction) {
    try {
      const threads = await threadService.getAllThreads();
      res.status(200).json(threads);
    } catch (error) {
      next(error);
    }
  }

  async getThreadById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid thread ID' });
        return;
      }
      const thread = await threadService.getThreadById(id);
      res.status(200).json(thread);
    } catch (error) {
      next(error);
    }
  }

  async createThread(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
         res.status(401).json({ error: 'Unauthorized' });
         return;
      }

      const data = CreateThreadDTOSchema.parse(req.body);
      const thread = await threadService.createThread(userId, data);
      res.status(201).json(thread);
    } catch (error) {
      next(error);
    }
  }
}

export const threadController = new ThreadController();
