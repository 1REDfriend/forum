import { threadService } from '../services/thread.service.js';
import { CreateThreadDTOSchema, UpdateThreadDTOSchema, PaginationQuerySchema } from '../types/index.js';
export class ThreadController {
    async getAllThreads(req, res, next) {
        try {
            const threads = await threadService.getAllThreads();
            res.status(200).json(threads);
        }
        catch (error) {
            next(error);
        }
    }
    async getThreadById(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid thread ID' });
                return;
            }
            const userId = req.user?.userId;
            const thread = await threadService.getThreadById(id, userId);
            res.status(200).json(thread);
        }
        catch (error) {
            next(error);
        }
    }
    async getThreadsByForumId(req, res, next) {
        try {
            const forumId = parseInt(req.params.forumId);
            if (isNaN(forumId)) {
                res.status(400).json({ error: 'Invalid forum ID' });
                return;
            }
            const { page, limit } = PaginationQuerySchema.parse(req.query);
            const userId = req.user?.userId;
            const result = await threadService.getThreadsByForumId(forumId, page, limit, userId);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async createThread(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const data = CreateThreadDTOSchema.parse(req.body);
            const thread = await threadService.createThread(userId, data);
            res.status(201).json(thread);
        }
        catch (error) {
            next(error);
        }
    }
    async updateThread(req, res, next) {
        try {
            const userId = req.user.userId;
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid thread ID' });
                return;
            }
            const data = UpdateThreadDTOSchema.parse(req.body);
            const thread = await threadService.updateThread(userId, id, data);
            res.status(200).json(thread);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteThread(req, res, next) {
        try {
            const userId = req.user.userId;
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid thread ID' });
                return;
            }
            await threadService.deleteThread(userId, id);
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    async pinThread(req, res, next) {
        try {
            const userId = req.user.userId;
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid thread ID' });
                return;
            }
            const thread = await threadService.pinThread(userId, id);
            res.status(200).json(thread);
        }
        catch (error) {
            next(error);
        }
    }
    async lockThread(req, res, next) {
        try {
            const userId = req.user.userId;
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid thread ID' });
                return;
            }
            const thread = await threadService.lockThread(userId, id);
            res.status(200).json(thread);
        }
        catch (error) {
            next(error);
        }
    }
}
export const threadController = new ThreadController();
//# sourceMappingURL=thread.controller.js.map