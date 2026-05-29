import { postService } from '../services/post.service.js';
import { CreatePostDTOSchema, UpdatePostDTOSchema, PaginationQuerySchema } from '../types/index.js';
export class PostController {
    async getPostsByThreadId(req, res, next) {
        try {
            const threadId = parseInt(req.params.threadId);
            if (isNaN(threadId)) {
                res.status(400).json({ error: 'Invalid thread ID' });
                return;
            }
            const { page, limit } = PaginationQuerySchema.parse(req.query);
            // Pass userId (may be undefined for unauthenticated users)
            const userId = req.user?.userId;
            const result = await postService.getPostsByThreadId(threadId, page, limit, userId);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async createPost(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const data = CreatePostDTOSchema.parse(req.body);
            const post = await postService.createPost(userId, data);
            res.status(201).json(post);
        }
        catch (error) {
            next(error);
        }
    }
    async updatePost(req, res, next) {
        try {
            const userId = req.user.userId;
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid post ID' });
                return;
            }
            const data = UpdatePostDTOSchema.parse(req.body);
            const post = await postService.updatePost(userId, id, data);
            res.status(200).json(post);
        }
        catch (error) {
            next(error);
        }
    }
    async deletePost(req, res, next) {
        try {
            const userId = req.user.userId;
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid post ID' });
                return;
            }
            await postService.deletePost(userId, id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
}
export const postController = new PostController();
//# sourceMappingURL=post.controller.js.map