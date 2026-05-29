import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { loginRateLimiter, registerRateLimiter, forgotPasswordRateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

router.post('/register', registerRateLimiter, authController.register.bind(authController));
router.post('/login', loginRateLimiter, authController.login.bind(authController));
router.post('/google', authController.google.bind(authController));
router.post('/forgot-password', forgotPasswordRateLimiter, authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));

export default router;
