import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { UpdateUserDTOSchema } from '../types/index.js';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await userService.getProfile(userId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = UpdateUserDTOSchema.parse(req.body);
      const user = await userService.updateProfile(userId, data);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }
      const user = await userService.getPublicProfile(id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
