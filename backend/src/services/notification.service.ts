import { notificationRepository } from '../repositories/notification.repository.js';
import { logger } from '../utils/logger.js';
import { realtimeService } from './realtime.service.js';
import { toPublicMediaUrl } from '../domain/media-url.js';

export type NotificationType =
  | 'thread_reply'
  | 'post_reply'
  | 'badge_awarded'
  | 'mention'
  | 'like_thread'
  | 'like_post'
  | 'report_resolved';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType | string;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  threadId?: string | null;
  payload?: Record<string, unknown> | null;
};

export class NotificationService {
  /**
   * Best-effort insert. Never throws to callers — primary writes (post/like)
   * must succeed even if the bell fails.
   */
  async create(input: CreateNotificationInput): Promise<void> {
    try {
      if (input.actorId && input.actorId === input.userId) return;

      await notificationRepository.create({
        userId: input.userId,
        type: input.type,
        actorId: input.actorId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        threadId: input.threadId ?? null,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      });
      realtimeService.publish(input.userId, {
        type: 'notification',
        payload: { type: input.type, threadId: input.threadId },
      });
    } catch (err) {
      logger.error('notification create failed', {
        userId: input.userId,
        type: input.type,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async list(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const [data, total] = await Promise.all([
      notificationRepository.listForUser(userId, safePage, safeLimit),
      notificationRepository.countForUser(userId),
    ]);

    return {
      data: data.map((row) => ({
        id: row.id,
        type: row.type,
        entityType: row.entityType,
        entityId: row.entityId,
        threadId: row.threadId,
        payload: parsePayload(row.payload),
        readAt: row.readAt,
        createdAt: row.createdAt,
        actor: row.actor?.id
          ? {
              id: row.actor.id,
              name: row.actor.name,
              avatar: toPublicMediaUrl(row.actor.avatar),
            }
          : null,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await notificationRepository.countUnread(userId);
    return { count };
  }

  async markRead(userId: string, body: { ids?: string[] | undefined; all?: boolean | undefined }) {
    if (body.all) {
      const n = await notificationRepository.markAllRead(userId);
      return { marked: n };
    }
    const ids = body.ids ?? [];
    const n = await notificationRepository.markRead(userId, ids);
    return { marked: n };
  }
}

function parsePayload(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const notificationService = new NotificationService();
