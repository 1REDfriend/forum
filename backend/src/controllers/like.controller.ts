import type { Request, Response, NextFunction } from 'express';
import { likeService } from '../services/like.service.js';

export class LikeController {
  async toggleThreadLike(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const threadId = Number(req.params.id);
      const result = await likeService.toggleThreadLike(userId, threadId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async togglePostLike(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const postId = Number(req.params.id);
      const result = await likeService.togglePostLike(userId, postId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const likeController = new LikeController();
