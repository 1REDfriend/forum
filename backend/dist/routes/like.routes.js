import { Router } from 'express';
import { likeController } from '../controllers/like.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
const router = Router();
router.post('/thread/:id', authenticate, likeController.toggleThreadLike.bind(likeController));
router.post('/post/:id', authenticate, likeController.togglePostLike.bind(likeController));
export default router;
//# sourceMappingURL=like.routes.js.map