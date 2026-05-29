import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
const router = Router();
// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);
// ─── Stats & Activity ──────────────────────────────────────────────────────
router.get('/stats', adminController.getStats.bind(adminController));
router.get('/activity', adminController.getRecentActivity.bind(adminController));
// ─── Users ────────────────────────────────────────────────────────────────
router.get('/users', adminController.getUsers.bind(adminController));
router.patch('/users/:id/role', adminController.updateUserRole.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));
// ─── Forums ───────────────────────────────────────────────────────────────
router.get('/forums', adminController.getForums.bind(adminController));
router.delete('/forums/:id', adminController.deleteForum.bind(adminController));
// ─── Threads ──────────────────────────────────────────────────────────────
router.get('/threads', adminController.getThreads.bind(adminController));
router.delete('/threads/:id', adminController.deleteThread.bind(adminController));
// ─── Posts ────────────────────────────────────────────────────────────────
router.get('/posts', adminController.getPosts.bind(adminController));
router.delete('/posts/:id', adminController.deletePost.bind(adminController));
export default router;
//# sourceMappingURL=admin.routes.js.map