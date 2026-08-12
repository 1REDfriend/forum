import { activityRepository } from '../repositories/activity.repository.js';
import { makeSnippet } from '../domain/snippet.js';
import { toPublicMediaUrl } from '../domain/media-url.js';

export type ActivityItem = {
  kind: 'post' | 'thread';
  id: string;
  threadId: string;
  threadTitle: string;
  forumId: string;
  forumName: string;
  author: { id: string; name: string; avatar: string | null };
  snippet: string;
  createdAt: string;
};

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

export class ActivityService {
  async getRecent(limitRaw: number): Promise<{ items: ActivityItem[] }> {
    const limit = Number.isFinite(limitRaw)
      ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
      : 20;

    const rows = await activityRepository.findRecent(limit);

    return {
      items: rows.map((r) => ({
        kind: r.kind,
        id: r.id,
        threadId: r.threadId,
        threadTitle: r.threadTitle,
        forumId: r.forumId,
        forumName: r.forumName,
        author: {
          id: r.authorId,
          name: r.authorName,
          avatar: toPublicMediaUrl(r.authorAvatar),
        },
        snippet: makeSnippet(r.body, 160),
        createdAt: toIso(r.createdAt),
      })),
    };
  }

  async getPublicStats() {
    return activityRepository.getPublicStats();
  }
}

export const activityService = new ActivityService();
