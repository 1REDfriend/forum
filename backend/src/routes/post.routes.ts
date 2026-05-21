import { Router } from 'express';
import { postController } from '../controllers/post.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Get posts for a specific thread
router.get('/thread/:threadId', postController.getPostsByThreadId);

// Protected routes
router.use(authenticate);
router.post('/', postController.createPost);

export default router;
