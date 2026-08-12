import { reactionRepository } from '../repositories/reaction.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { notificationService } from './notification.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const ALLOWED = new Set(['❤️', '🔥', '😂', '🎉', '👀', '👍', '💡']);

export class ReactionService {
  async toggle(
    userId: string,
    body: { emoji: string; threadId?: string | undefined; postId?: string | undefined },
  ) {
    if (!ALLOWED.has(body.emoji)) throw BadRequestError('Unsupported emoji');
    if (body.threadId) {
      const t = await threadRepository.findRawById(body.threadId);
      if (!t) throw NotFoundError('Thread not found');
      const r = await reactionRepository.toggleThread(userId, body.threadId, body.emoji);
      if (r.reacted) {
        await notificationService.create({
          userId: t.authorId,
          type: 'like_thread',
          actorId: userId,
          entityType: 'thread',
          entityId: body.threadId,
          threadId: body.threadId,
          payload: { emoji: body.emoji, reaction: true },
        });
      }
      const counts = await reactionRepository.countsForThread(body.threadId);
      const mine = await reactionRepository.userEmojisForThread(userId, body.threadId);
      return { ...r, counts, mine };
    }
    if (body.postId) {
      const p = await postRepository.findRawById(body.postId);
      if (!p) throw NotFoundError('Post not found');
      const r = await reactionRepository.togglePost(userId, body.postId, body.emoji);
      if (r.reacted) {
        await notificationService.create({
          userId: p.authorId,
          type: 'like_post',
          actorId: userId,
          entityType: 'post',
          entityId: body.postId,
          threadId: p.threadId,
          payload: { emoji: body.emoji, reaction: true },
        });
      }
      return r;
    }
    throw BadRequestError('threadId or postId required');
  }
}

export const reactionService = new ReactionService();
