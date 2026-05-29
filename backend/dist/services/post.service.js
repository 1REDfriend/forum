import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { likeRepository } from '../repositories/like.repository.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
export class PostService {
    async getPostsByThreadId(threadId, page = 1, limit = 20, userId) {
        const [rawData, total] = await Promise.all([
            postRepository.findByThreadId(threadId, page, limit),
            postRepository.countByThreadId(threadId),
        ]);
        const postIds = rawData.map((p) => p.id);
        // Batch-fetch like counts and user's liked posts
        const [likeCounts, userLikedSet] = await Promise.all([
            likeRepository.getPostLikeCounts(postIds),
            userId ? likeRepository.getPostLikesForUser(userId, postIds) : Promise.resolve(new Set()),
        ]);
        const data = rawData.map((p) => ({
            ...p,
            likeCount: likeCounts.get(p.id) ?? 0,
            isLikedByMe: userLikedSet.has(p.id),
        }));
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async createPost(userId, data) {
        return await postRepository.create({
            content: data.content,
            threadId: data.threadId,
            authorId: userId,
        });
    }
    async updatePost(userId, postId, data) {
        const post = await postRepository.findById(postId);
        if (!post) {
            throw NotFoundError('Post not found');
        }
        const user = await userRepository.findById(userId);
        if (post.authorId !== userId && user?.role !== 'admin') {
            throw ForbiddenError('You do not have permission to edit this post');
        }
        return await postRepository.update(postId, { content: data.content });
    }
    async deletePost(userId, postId) {
        const post = await postRepository.findById(postId);
        if (!post) {
            throw NotFoundError('Post not found');
        }
        const user = await userRepository.findById(userId);
        if (post.authorId !== userId && user?.role !== 'admin') {
            throw ForbiddenError('You do not have permission to delete this post');
        }
        await postRepository.delete(postId);
    }
}
export const postService = new PostService();
//# sourceMappingURL=post.service.js.map