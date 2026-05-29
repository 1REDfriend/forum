import type { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/user.repository.js';

/**
 * Middleware: requires the authenticated user to have role = 'admin'.
 * Must be used AFTER the `authenticate` middleware.
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await userRepository.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
