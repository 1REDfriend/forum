import { Router } from 'express';
import { threadController } from '../controllers/thread.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', threadController.getAllThreads);
router.get('/:id', threadController.getThreadById);

// Protected routes
router.use(authenticate);
router.post('/', threadController.createThread);

export default router;
