import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      details: err.issues,
    });
    return;
  }

  console.error('[Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
};
