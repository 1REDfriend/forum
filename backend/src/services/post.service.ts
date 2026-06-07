import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { likeRepository } from '../repositories/like.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { tierService } from './tier.service.js';
import { badgeService } from './badge.service.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import type { CreatePostDTO, UpdatePostDTO } from '../types/index.js';

export class PostService {
  async getPostsByThreadId(threadId: string, page: number = 1, limit: number = 20, userId?: string) {
    const [rawData, total] = await Promise.all([
      postRepository.findByThreadId(threadId, page, limit),
      postRepository.countByThreadId(threadId),
    ]);

    const postIds = rawData.map((p) => p.id);

    // Batch-fetch like counts and user's liked posts
    const [likeCounts, userLikedSet] = await Promise.all([
      likeRepository.getPostLikeCounts(postIds),
      userId ? likeRepository.getPostLikesForUser(userId, postIds) : Promise.resolve(new Set<string>()),
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

  async createPost(userId: string, data: CreatePostDTO) {
    const thread = await threadRepository.findRawById(data.threadId);
    if (!thread) {
      throw NotFoundError('Thread not found');
    }
    if (thread.isLocked) {
      throw ForbiddenError('This thread is locked and cannot receive replies');
    }
    const created = await postRepository.create({
      content: data.content,
      threadId: data.threadId,
      authorId: userId,
    });
    return { ...created, newlyAwardedBadges: await this.awardBadges(userId) };
  }

  /** Sync auto badges after content creation; never let it break the create. */
  private async awardBadges(userId: string) {
    try {
      const s = await tierService.computeStats(userId);
      return await badgeService.awardNewAuto(userId, {
        posts: s.threads + s.posts,
        likesReceived: s.likesReceived,
        accountAgeDays: s.accountAgeDays,
        longestStreak: s.longestStreak,
      });
    } catch {
      return [];
    }
  }

  async updatePost(userId: string, postId: string, data: UpdatePostDTO) {
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

  async deletePost(userId: string, postId: string) {
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
