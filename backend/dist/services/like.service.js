import { likeRepository } from '../repositories/like.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { NotFoundError } from '../utils/errors.js';
export class LikeService {
    async toggleThreadLike(userId, threadId) {
        const thread = await threadRepository.findRawById(threadId);
        if (!thread)
            throw NotFoundError('Thread not found');
        const existing = await likeRepository.findThreadLike(userId, threadId);
        if (existing) {
            await likeRepository.removeThreadLike(userId, threadId);
            const likeCount = await likeRepository.countThreadLikes(threadId);
            return { liked: false, likeCount };
        }
        else {
            await likeRepository.addThreadLike(userId, threadId);
            const likeCount = await likeRepository.countThreadLikes(threadId);
            return { liked: true, likeCount };
        }
    }
    async togglePostLike(userId, postId) {
        const post = await postRepository.findRawById(postId);
        if (!post)
            throw NotFoundError('Post not found');
        const existing = await likeRepository.findPostLike(userId, postId);
        if (existing) {
            await likeRepository.removePostLike(userId, postId);
            const likeCount = await likeRepository.countPostLikes(postId);
            return { liked: false, likeCount };
        }
        else {
            await likeRepository.addPostLike(userId, postId);
            const likeCount = await likeRepository.countPostLikes(postId);
            return { liked: true, likeCount };
        }
    }
    async getThreadLikeStatus(userId, threadId) {
        const likeCount = await likeRepository.countThreadLikes(threadId);
        const isLikedByMe = userId
            ? !!(await likeRepository.findThreadLike(userId, threadId))
            : false;
        return { likeCount, isLikedByMe };
    }
}
export const likeService = new LikeService();
//# sourceMappingURL=like.service.js.map