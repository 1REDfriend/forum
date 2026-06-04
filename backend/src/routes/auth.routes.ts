import { Elysia } from 'elysia';
import { authService } from '../services/auth.service.js';
import {
  RegisterDTO,
  LoginDTO,
  GoogleAuthDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  RefreshDTO,
  LogoutDTO,
} from '../types/index.js';
import { loginRateLimit, registerRateLimit, forgotPasswordRateLimit } from '../http/rateLimit.js';

export const authRoutes = new Elysia({ prefix: '/auth', tags: ['Auth'] })
  .post(
    '/register',
    ({ body, set }) => {
      set.status = 201;
      return authService.register(body);
    },
    { body: RegisterDTO, beforeHandle: registerRateLimit },
  )
  .post('/login', ({ body }) => authService.login(body), {
    body: LoginDTO,
    beforeHandle: loginRateLimit,
  })
  .post('/google', ({ body }) => authService.googleAuth(body), { body: GoogleAuthDTO })
  .post('/forgot-password', ({ body }) => authService.forgotPassword(body), {
    body: ForgotPasswordDTO,
    beforeHandle: forgotPasswordRateLimit,
  })
  .post('/reset-password', ({ body }) => authService.resetPassword(body), { body: ResetPasswordDTO })
  .post('/refresh', ({ body }) => authService.refresh(body.refreshToken), { body: RefreshDTO })
  .post('/logout', ({ body }) => authService.logout(body.refreshToken), { body: LogoutDTO });
