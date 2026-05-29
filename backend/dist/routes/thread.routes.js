import { Router } from 'express';
import { threadController } from '../controllers/thread.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js';
const router = Router();
// Public routes with optional auth (so likes are personalized for logged-in users)
router.get('/', optionalAuthenticate, threadController.getAllThreads.bind(threadController));
router.get('/forum/:forumId', optionalAuthenticate, threadController.getThreadsByForumId.bind(threadController));
router.get('/:id', optionalAuthenticate, threadController.getThreadById.bind(threadController));
// Protected routes
router.use(authenticate);
router.post('/', threadController.createThread.bind(threadController));
router.put('/:id', threadController.updateThread.bind(threadController));
router.delete('/:id', threadController.deleteThread.bind(threadController));
router.patch('/:id/pin', threadController.pinThread.bind(threadController));
router.patch('/:id/lock', threadController.lockThread.bind(threadController));
export default router;
//# sourceMappingURL=thread.routes.js.map