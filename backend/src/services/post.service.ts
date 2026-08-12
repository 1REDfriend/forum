import { postRepository } from '../repositories/post.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { likeRepository } from '../repositories/like.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { watchRepository } from '../repositories/watch.repository.js';
import { moderatorRepository } from '../repositories/moderator.repository.js';
import { tierService } from './tier.service.js';
import { badgeService } from './badge.service.js';
import { notificationService } from './notification.service.js';
import { realtimeService } from './realtime.service.js';
import { makeSnippet } from '../domain/snippet.js';
import { parseMentionUserIds } from '../domain/mentions.js';
import { canPostInForum } from '../domain/forum-policy.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import type { CreatePostDTO, UpdatePostDTO } from '../types/index.js';
import { mapUserMediaFields, rewriteMediaUrlsInText } from '../domain/media-url.js';

/** Rewrite CDN hosts in post body + nested author media for API responses. */
function presentPost<T extends { content?: string | null; author?: any }>(p: T): T {
  return {
    ...p,
    ...(p.content !== undefined ? { content: rewriteMediaUrlsInText(p.content as any) } : {}),
    ...(p.author ? { author: mapUserMediaFields(p.author) } : {}),
  };
}

export class PostService {
  async getPostsByThreadId(threadId: string, page: number = 1, limit: number = 20, userId?: string) {
    const [rawData, total] = await Promise.all([
      postRepository.findByThreadId(threadId, page, limit),
      postRepository.countByThreadId(threadId),
    ]);

    const postIds = rawData.map((p) => p.id);

    const [likeCounts, userLikedSet] = await Promise.all([
      likeRepository.getPostLikeCounts(postIds),
      userId ? likeRepository.getPostLikesForUser(userId, postIds) : Promise.resolve(new Set<string>()),
    ]);

    const data = rawData.map((p) =>
      presentPost({
        ...p,
        likeCount: likeCounts.get(p.id) ?? 0,
        isLikedByMe: userLikedSet.has(p.id),
      }),
    );

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

    const [forum, actor] = await Promise.all([
      forumRepository.findById(thread.forumId),
      userRepository.findById(userId),
    ]);
    if (!forum) throw NotFoundError('Forum not found');
    if (!canPostInForum(actor?.role, forum.postRoleMin)) {
      throw ForbiddenError('You do not have permission to post in this forum');
    }

    let replyToPostId: string | null = null;
    let parentAuthorId: string | null = null;
    if (data.replyToPostId) {
      const parent = await postRepository.findById(data.replyToPostId);
      if (!parent || parent.threadId !== data.threadId) {
        throw BadRequestError('replyToPostId must refer to a post in the same thread');
      }
      replyToPostId = parent.id;
      parentAuthorId = parent.authorId;
    }

    const created = await postRepository.create({
      content: data.content,
      threadId: data.threadId,
      authorId: userId,
      replyToPostId,
    });

    const payload = {
      snippet: makeSnippet(data.content, 120),
      threadTitle: thread.title,
    };

    // Prefer post_reply when quoting someone; else notify thread author.
    if (parentAuthorId && parentAuthorId !== userId) {
      await notificationService.create({
        userId: parentAuthorId,
        type: 'post_reply',
        actorId: userId,
        entityType: 'post',
        entityId: created.id,
        threadId: thread.id,
        payload,
      });
      // Also notify thread author if different from parent
      if (thread.authorId !== parentAuthorId && thread.authorId !== userId) {
        await notificationService.create({
          userId: thread.authorId,
          type: 'thread_reply',
          actorId: userId,
          entityType: 'post',
          entityId: created.id,
          threadId: thread.id,
          payload,
        });
      }
    } else {
      await notificationService.create({
        userId: thread.authorId,
        type: 'thread_reply',
        actorId: userId,
        entityType: 'post',
        entityId: created.id,
        threadId: thread.id,
        payload,
      });
    }

    await this.notifyMentions(userId, data.content, created.id, thread.id, thread.title);

    // Watchers (except actor + people already notified above)
    try {
      const watchers = await watchRepository.listWatcherIds(thread.id);
      for (const wid of watchers) {
        if (wid === userId || wid === thread.authorId || wid === parentAuthorId) continue;
        await notificationService.create({
          userId: wid,
          type: 'thread_reply',
          actorId: userId,
          entityType: 'post',
          entityId: created.id,
          threadId: thread.id,
          payload: { ...payload, watched: true },
        });
      }
    } catch {
      /* never break create */
    }

    realtimeService.publishMany(
      [thread.authorId, ...(await watchRepository.listWatcherIds(thread.id).catch(() => [] as string[]))],
      { type: 'thread_post', payload: { threadId: thread.id, postId: created.id } },
    );

    return { ...presentPost(created), newlyAwardedBadges: await this.awardBadges(userId) };
  }

  async acceptAnswer(userId: string, postId: string) {
    const post = await postRepository.findById(postId);
    if (!post) throw NotFoundError('Post not found');
    const thread = await threadRepository.findRawById(post.threadId);
    if (!thread) throw NotFoundError('Thread not found');
    if (!thread.isQa) throw BadRequestError('This thread is not a Q&A thread');
    const user = await userRepository.findById(userId);
    const isMod =
      user?.role === 'admin' ||
      user?.role === 'manager' ||
      (await moderatorRepository.isModerator(thread.forumId, userId));
    if (thread.authorId !== userId && !isMod) {
      throw ForbiddenError('Only the thread author or a moderator can accept an answer');
    }
    await postRepository.clearAcceptedInThread(post.threadId);
    return postRepository.update(postId, { isAccepted: true });
  }

  private async notifyMentions(
    actorId: string,
    content: string,
    postId: string,
    threadId: string,
    threadTitle: string,
  ) {
    const ids = parseMentionUserIds(content, 20);
    for (const mentionedId of ids) {
      if (mentionedId === actorId) continue;
      const exists = await userRepository.findById(mentionedId);
      if (!exists) continue;
      await notificationService.create({
        userId: mentionedId,
        type: 'mention',
        actorId,
        entityType: 'post',
        entityId: postId,
        threadId,
        payload: {
          snippet: makeSnippet(content, 120),
          threadTitle,
        },
      });
    }
  }

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
    const thread = await threadRepository.findRawById(post.threadId);
    const isMod =
      !!thread &&
      (user?.role === 'admin' ||
        user?.role === 'manager' ||
        (await moderatorRepository.isModerator(thread.forumId, userId)));
    if (post.authorId !== userId && user?.role !== 'admin' && !isMod) {
      throw ForbiddenError('You do not have permission to edit this post');
    }

    const updated = await postRepository.update(postId, { content: data.content });
    // Mentions on edit: notify newly mentioned users (simple: all parsed ids)
    if (thread) {
      await this.notifyMentions(userId, data.content, postId, thread.id, thread.title);
    }
    return updated ? presentPost(updated) : updated;
  }

  async deletePost(userId: string, postId: string) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw NotFoundError('Post not found');
    }

    const user = await userRepository.findById(userId);
    const thread = await threadRepository.findRawById(post.threadId);
    const isMod =
      !!thread &&
      (user?.role === 'admin' ||
        user?.role === 'manager' ||
        (await moderatorRepository.isModerator(thread.forumId, userId)));
    if (post.authorId !== userId && user?.role !== 'admin' && !isMod) {
      throw ForbiddenError('You do not have permission to delete this post');
    }

    await postRepository.delete(postId);
  }
}

export const postService = new PostService();
