import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { reactions } from '../db/schema.js';

export class ReactionRepository {
  async toggleThread(userId: string, threadId: string, emoji: string) {
    const [existing] = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.threadId, threadId),
          eq(reactions.emoji, emoji),
        ),
      )
      .limit(1);
    if (existing) {
      await db.delete(reactions).where(eq(reactions.id, existing.id));
      return { reacted: false as const };
    }
    await db.insert(reactions).values({ userId, threadId, emoji, postId: null });
    return { reacted: true as const };
  }

  async togglePost(userId: string, postId: string, emoji: string) {
    const [existing] = await db
      .select()
      .from(reactions)
      .where(
        and(eq(reactions.userId, userId), eq(reactions.postId, postId), eq(reactions.emoji, emoji)),
      )
      .limit(1);
    if (existing) {
      await db.delete(reactions).where(eq(reactions.id, existing.id));
      return { reacted: false as const };
    }
    await db.insert(reactions).values({ userId, postId, emoji, threadId: null });
    return { reacted: true as const };
  }

  async countsForThread(threadId: string) {
    const rows = await db
      .select({
        emoji: reactions.emoji,
        count: sql<number>`count(*)::int`,
      })
      .from(reactions)
      .where(eq(reactions.threadId, threadId))
      .groupBy(reactions.emoji);
    return rows;
  }

  async countsForPosts(postIds: string[]) {
    if (postIds.length === 0) return new Map<string, { emoji: string; count: number }[]>();
    const rows = await db
      .select({
        postId: reactions.postId,
        emoji: reactions.emoji,
        count: sql<number>`count(*)::int`,
      })
      .from(reactions)
      .where(inArray(reactions.postId, postIds))
      .groupBy(reactions.postId, reactions.emoji);
    const map = new Map<string, { emoji: string; count: number }[]>();
    for (const r of rows) {
      if (!r.postId) continue;
      const list = map.get(r.postId) ?? [];
      list.push({ emoji: r.emoji, count: r.count });
      map.set(r.postId, list);
    }
    return map;
  }

  async userEmojisForThread(userId: string, threadId: string): Promise<string[]> {
    const rows = await db
      .select({ emoji: reactions.emoji })
      .from(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.threadId, threadId)));
    return rows.map((r) => r.emoji);
  }

  async userEmojisForPosts(userId: string, postIds: string[]) {
    if (postIds.length === 0) return new Map<string, string[]>();
    const rows = await db
      .select({ postId: reactions.postId, emoji: reactions.emoji })
      .from(reactions)
      .where(and(eq(reactions.userId, userId), inArray(reactions.postId, postIds)));
    const map = new Map<string, string[]>();
    for (const r of rows) {
      if (!r.postId) continue;
      const list = map.get(r.postId) ?? [];
      list.push(r.emoji);
      map.set(r.postId, list);
    }
    return map;
  }
}

export const reactionRepository = new ReactionRepository();
