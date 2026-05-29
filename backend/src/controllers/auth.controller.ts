import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import {
  RegisterDTOSchema,
  LoginDTOSchema,
  GoogleAuthDTOSchema,
  ForgotPasswordDTOSchema,
  ResetPasswordDTOSchema,
} from '../types/index.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = RegisterDTOSchema.parse(req.body);
      const result = await authService.register(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = LoginDTOSchema.parse(req.body);
      const result = await authService.login(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async google(req: Request, res: Response, next: NextFunction) {
    try {
      const data = GoogleAuthDTOSchema.parse(req.body);
      const result = await authService.googleAuth(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = ForgotPasswordDTOSchema.parse(req.body);
      const result = await authService.forgotPassword(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = ResetPasswordDTOSchema.parse(req.body);
      const result = await authService.resetPassword(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
