import type { Request, Response, NextFunction } from 'express';
import { postService } from '../services/post.service.js';
import { CreatePostDTOSchema } from '../types/index.js';

export class PostController {
  async getPostsByThreadId(req: Request, res: Response, next: NextFunction) {
    try {
      const threadId = parseInt(req.params.threadId as string);
      if (isNaN(threadId)) {
        res.status(400).json({ error: 'Invalid thread ID' });
        return;
      }
      const posts = await postService.getPostsByThreadId(threadId);
      res.status(200).json(posts);
    } catch (error) {
      next(error);
    }
  }

  async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
         res.status(401).json({ error: 'Unauthorized' });
         return;
      }

      const data = CreatePostDTOSchema.parse(req.body);
      const post = await postService.createPost(userId, data);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }
}

export const postController = new PostController();
