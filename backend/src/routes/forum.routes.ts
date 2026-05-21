import { Router } from 'express';
import { forumController } from '../controllers/forum.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', forumController.getAllForums);
router.get('/:id', forumController.getForumById);

// Protected routes
router.use(authenticate);
router.post('/', forumController.createForum);

export default router;
