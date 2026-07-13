import { Hono } from 'hono';
import { authService } from '../services/auth.service.js';
import { validate } from '../http/validate.js';
import {
  RegisterDTO,
  LoginDTO,
  GoogleAuthDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  RefreshDTO,
  LogoutDTO,
} from '../types/index.js';
import {
  loginRateLimit,
  registerRateLimit,
  forgotPasswordRateLimit,
  googleRateLimit,
  refreshRateLimit,
} from '../http/rateLimit.js';

export const authRoutes = new Hono()
  .post('/register', registerRateLimit, validate('json', RegisterDTO), async (c) =>
    c.json(await authService.register(c.req.valid('json')), 201),
  )
  .post('/login', loginRateLimit, validate('json', LoginDTO), async (c) =>
    c.json(await authService.login(c.req.valid('json'))),
  )
  .post('/google', googleRateLimit, validate('json', GoogleAuthDTO), async (c) =>
    c.json(await authService.googleAuth(c.req.valid('json'))),
  )
  .post('/forgot-password', forgotPasswordRateLimit, validate('json', ForgotPasswordDTO), async (c) =>
    c.json(await authService.forgotPassword(c.req.valid('json'))),
  )
  .post('/reset-password', validate('json', ResetPasswordDTO), async (c) =>
    c.json(await authService.resetPassword(c.req.valid('json'))),
  )
  .post('/refresh', refreshRateLimit, validate('json', RefreshDTO), async (c) =>
    c.json(await authService.refresh(c.req.valid('json').refreshToken)),
  )
  .post('/logout', validate('json', LogoutDTO), async (c) =>
    c.json(await authService.logout(c.req.valid('json').refreshToken)),
  );
