import { threadRepository } from '../repositories/thread.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { likeRepository } from '../repositories/like.repository.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
export class ThreadService {
    async getAllThreads() {
        return await threadRepository.findAll();
    }
    async getThreadById(id, userId) {
        const thread = await threadRepository.findById(id);
        if (!thread) {
            throw NotFoundError('Thread not found');
        }
        const [likeCount, isLikedByMe] = await Promise.all([
            likeRepository.countThreadLikes(id),
            userId ? likeRepository.findThreadLike(userId, id).then(r => !!r) : Promise.resolve(false),
        ]);
        return { ...thread, likeCount, isLikedByMe };
    }
    async getThreadsByForumId(forumId, page, limit, userId) {
        const [data, total] = await Promise.all([
            threadRepository.findByForumId(forumId, page, limit),
            threadRepository.countByForumId(forumId),
        ]);
        // Batch fetch like counts and user liked set
        const threadIds = data.map((t) => t.id);
        const [likeCounts, userLikedSet] = await Promise.all([
            likeRepository.getThreadLikeCounts(threadIds),
            userId ? likeRepository.getThreadLikesForUser(userId, threadIds) : Promise.resolve(new Set()),
        ]);
        const enriched = data.map((t) => ({
            ...t,
            likeCount: likeCounts.get(t.id) ?? 0,
            isLikedByMe: userLikedSet.has(t.id),
        }));
        return {
            data: enriched,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async createThread(userId, data) {
        return await threadRepository.create({
            title: data.title,
            content: data.content,
            forumId: data.forumId,
            authorId: userId,
        });
    }
    async updateThread(userId, threadId, data) {
        const thread = await threadRepository.findRawById(threadId);
        if (!thread) {
            throw NotFoundError('Thread not found');
        }
        const user = await userRepository.findById(userId);
        if (thread.authorId !== userId && user?.role !== 'admin') {
            throw ForbiddenError('You do not have permission to edit this thread');
        }
        const updateData = {};
        if (data.title !== undefined)
            updateData.title = data.title;
        if (data.content !== undefined)
            updateData.content = data.content;
        return await threadRepository.update(threadId, updateData);
    }
    async deleteThread(userId, threadId) {
        const thread = await threadRepository.findRawById(threadId);
        if (!thread) {
            throw NotFoundError('Thread not found');
        }
        const user = await userRepository.findById(userId);
        if (thread.authorId !== userId && user?.role !== 'admin') {
            throw ForbiddenError('You do not have permission to delete this thread');
        }
        await threadRepository.delete(threadId);
    }
    async pinThread(userId, threadId) {
        const user = await userRepository.findById(userId);
        if (user?.role !== 'admin') {
            throw ForbiddenError('Only admins can pin threads');
        }
        const thread = await threadRepository.findRawById(threadId);
        if (!thread)
            throw NotFoundError('Thread not found');
        return await threadRepository.update(threadId, { isPinned: !thread.isPinned });
    }
    async lockThread(userId, threadId) {
        const user = await userRepository.findById(userId);
        if (user?.role !== 'admin') {
            throw ForbiddenError('Only admins can lock threads');
        }
        const thread = await threadRepository.findRawById(threadId);
        if (!thread)
            throw NotFoundError('Thread not found');
        return await threadRepository.update(threadId, { isLocked: !thread.isLocked });
    }
}
export const threadService = new ThreadService();
//# sourceMappingURL=thread.service.js.map