import { Router } from 'express';
import { postController } from '../controllers/post.controller.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js';
const router = Router();
// Get posts for a specific thread — optional auth so isLikedByMe is populated for logged-in users
router.get('/thread/:threadId', optionalAuthenticate, postController.getPostsByThreadId.bind(postController));
// Protected routes
router.use(authenticate);
router.post('/', postController.createPost.bind(postController));
router.put('/:id', postController.updatePost.bind(postController));
router.delete('/:id', postController.deletePost.bind(postController));
export default router;
//# sourceMappingURL=post.routes.js.map