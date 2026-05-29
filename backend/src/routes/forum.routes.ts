import { Router } from 'express';
import { forumController } from '../controllers/forum.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', forumController.getAllForums);
router.get('/:id', forumController.getForumById);

// Protected routes
router.use(authenticate);
router.post('/', forumController.createForum);
router.put('/:id', forumController.updateForum);
router.delete('/:id', forumController.deleteForum);

export default router;
