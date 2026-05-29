import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { likeRepository } from '../repositories/like.repository.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import type { CreatePostDTO, UpdatePostDTO } from '../types/index.js';

export class PostService {
  async getPostsByThreadId(threadId: number, page: number = 1, limit: number = 20, userId?: number) {
    const [rawData, total] = await Promise.all([
      postRepository.findByThreadId(threadId, page, limit),
      postRepository.countByThreadId(threadId),
    ]);

    const postIds = rawData.map((p) => p.id);

    // Batch-fetch like counts and user's liked posts
    const [likeCounts, userLikedSet] = await Promise.all([
      likeRepository.getPostLikeCounts(postIds),
      userId ? likeRepository.getPostLikesForUser(userId, postIds) : Promise.resolve(new Set<number>()),
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

  async createPost(userId: number, data: CreatePostDTO) {
    return await postRepository.create({
      content: data.content,
      threadId: data.threadId,
      authorId: userId,
    });
  }

  async updatePost(userId: number, postId: number, data: UpdatePostDTO) {
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

  async deletePost(userId: number, postId: number) {
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
