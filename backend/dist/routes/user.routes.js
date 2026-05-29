import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
const router = Router();
// Protected routes (must be before /:id to avoid 'me' being captured as an id param)
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, userController.updateMe);
// Public routes
router.get('/:id', userController.getPublicProfile);
export default router;
//# sourceMappingURL=user.routes.js.map