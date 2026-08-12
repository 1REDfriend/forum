import { threadRepository, type FindByForumOptions, type ThreadListFilter, type ThreadListSort } from '../repositories/thread.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { likeRepository } from '../repositories/like.repository.js';
import { threadReadRepository } from '../repositories/threadRead.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { tagRepository } from '../repositories/tag.repository.js';
import { moderatorRepository } from '../repositories/moderator.repository.js';
import { pollRepository } from '../repositories/poll.repository.js';
import { watchRepository } from '../repositories/watch.repository.js';
import { tierService } from './tier.service.js';
import { badgeService } from './badge.service.js';
import { notificationService } from './notification.service.js';
import { makeSnippet } from '../domain/snippet.js';
import { parseMentionUserIds } from '../domain/mentions.js';
import { canPostInForum, canModerateForumContent } from '../domain/forum-policy.js';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import type { CreateThreadDTO, UpdateThreadDTO } from '../types/index.js';

function lastActivityAt(t: { createdAt: Date | string; lastPostAt?: string | Date | null }): Date {
  const created = new Date(t.createdAt);
  if (!t.lastPostAt) return created;
  const lastPost = new Date(t.lastPostAt);
  return lastPost > created ? lastPost : created;
}

function isUnreadFor(
  t: { createdAt: Date | string; lastPostAt?: string | Date | null },
  lastReadAt: Date | undefined,
): boolean {
  const activity = lastActivityAt(t).getTime();
  if (!lastReadAt) return true;
  return activity > lastReadAt.getTime();
}

export class ThreadService {
  async getAllThreads() {
    return await threadRepository.findAll();
  }

  async getThreadById(id: string, userId?: string) {
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

  async markRead(userId: string, threadId: string, at?: Date) {
    const thread = await threadRepository.findRawById(threadId);
    if (!thread) throw NotFoundError('Thread not found');
    await threadReadRepository.upsert(userId, threadId, at ?? new Date());
    return { ok: true as const };
  }

  async getThreadsByForumId(
    forumId: string,
    page: number,
    limit: number,
    userId?: string,
    sort: ThreadListSort = 'newest',
    filter: ThreadListFilter = 'all',
  ) {
    if (filter === 'mine' && !userId) {
      throw UnauthorizedError('Authentication required for filter=mine');
    }

    const opts: FindByForumOptions = {
      sort,
      filter,
      authorId: filter === 'mine' ? userId : undefined,
    };

    const [data, total] = await Promise.all([
      threadRepository.findByForumId(forumId, page, limit, opts),
      threadRepository.countByForumId(forumId, opts),
    ]);

    const threadIds = data.map((t) => t.id);
    const [likeCounts, userLikedSet, lastReadMap] = await Promise.all([
      likeRepository.getThreadLikeCounts(threadIds),
      userId ? likeRepository.getThreadLikesForUser(userId, threadIds) : Promise.resolve(new Set<string>()),
      userId ? threadReadRepository.getLastReadMap(userId, threadIds) : Promise.resolve(new Map<string, Date>()),
    ]);

    const tagsMap = await tagRepository.listForThreads(threadIds);

    const enriched = data.map((t) => ({
      ...t,
      likeCount: likeCounts.get(t.id) ?? 0,
      isLikedByMe: userLikedSet.has(t.id),
      isUnread: userId ? isUnreadFor(t, lastReadMap.get(t.id)) : false,
      tags: tagsMap.get(t.id) ?? [],
    }));

    // Optional tag filter
    // (applied post-query if ?tag=slug passed via filter extension — handled in route)

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createThread(userId: string, data: CreateThreadDTO) {
    const forum = await forumRepository.findById(data.forumId);
    if (!forum) throw NotFoundError('Forum not found');

    const actor = await userRepository.findById(userId);
    if (!canPostInForum(actor?.role, forum.postRoleMin)) {
      throw ForbiddenError('You do not have permission to post in this forum');
    }

    const created = await threadRepository.create({
      title: data.title,
      content: data.content,
      forumId: data.forumId,
      authorId: userId,
      isQa: data.isQa === true,
    });

    // Author auto-watches own thread
    await watchRepository.watch(userId, created.id).catch(() => {});

    if (data.tags?.length) {
      await tagRepository.setThreadTags(created.id, data.tags);
    }

    if (data.poll) {
      await pollRepository.create(
        created.id,
        data.poll.question,
        data.poll.options,
        data.poll.closesAt ? new Date(data.poll.closesAt) : null,
      );
    }

    // Mentions in OP body
    for (const mentionedId of parseMentionUserIds(data.content, 20)) {
      if (mentionedId === userId) continue;
      const exists = await userRepository.findById(mentionedId);
      if (!exists) continue;
      await notificationService.create({
        userId: mentionedId,
        type: 'mention',
        actorId: userId,
        entityType: 'thread',
        entityId: created.id,
        threadId: created.id,
        payload: {
          snippet: makeSnippet(data.content, 120),
          threadTitle: data.title,
        },
      });
    }

    return { ...created, newlyAwardedBadges: await this.awardBadges(userId) };
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

  async updateThread(userId: string, threadId: string, data: UpdateThreadDTO) {
    const thread = await threadRepository.findRawById(threadId);
    if (!thread) {
      throw NotFoundError('Thread not found');
    }

    const user = await userRepository.findById(userId);
    if (thread.authorId !== userId && user?.role !== 'admin') {
      throw ForbiddenError('You do not have permission to edit this thread');
    }

    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    return await threadRepository.update(threadId, updateData);
  }

  async deleteThread(userId: string, threadId: string) {
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

  private async assertCanModerate(userId: string, forumId: string) {
    const user = await userRepository.findById(userId);
    const isBoardMod = await moderatorRepository.isModerator(forumId, userId);
    if (!canModerateForumContent(user?.role, isBoardMod)) {
      throw ForbiddenError('You do not have permission to moderate this forum');
    }
  }

  async pinThread(userId: string, threadId: string) {
    const thread = await threadRepository.findRawById(threadId);
    if (!thread) throw NotFoundError('Thread not found');
    await this.assertCanModerate(userId, thread.forumId);
    return await threadRepository.update(threadId, { isPinned: !thread.isPinned });
  }

  async lockThread(userId: string, threadId: string) {
    const thread = await threadRepository.findRawById(threadId);
    if (!thread) throw NotFoundError('Thread not found');
    await this.assertCanModerate(userId, thread.forumId);
    return await threadRepository.update(threadId, { isLocked: !thread.isLocked });
  }

  async setWatch(userId: string, threadId: string, watch: boolean) {
    const thread = await threadRepository.findRawById(threadId);
    if (!thread) throw NotFoundError('Thread not found');
    if (watch) await watchRepository.watch(userId, threadId);
    else await watchRepository.unwatch(userId, threadId);
    return { watching: watch };
  }

  async isWatching(userId: string, threadId: string) {
    return { watching: await watchRepository.isWatching(userId, threadId) };
  }
}

export const threadService = new ThreadService();
