import { eq, and, isNull, isNotNull, count, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { likes } from '../db/schema.js';

export class LikeRepository {
  // --- Thread Likes ---
  async findThreadLike(userId: string, threadId: string) {
    const [row] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.threadId, threadId)));
    return row;
  }

  async addThreadLike(userId: string, threadId: string) {
    await db.insert(likes).values({ userId, threadId }).onConflictDoNothing();
  }

  async removeThreadLike(userId: string, threadId: string) {
    await db.delete(likes).where(
      and(eq(likes.userId, userId), eq(likes.threadId, threadId))
    );
  }

  async countThreadLikes(threadId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(likes)
      .where(and(eq(likes.threadId, threadId), isNull(likes.postId)));
    return row?.total ?? 0;
  }

  async getThreadLikesForUser(userId: string, threadIds: string[]): Promise<Set<string>> {
    if (threadIds.length === 0) return new Set();
    const rows = await db
      .select({ threadId: likes.threadId })
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          isNotNull(likes.threadId),
          isNull(likes.postId)
        )
      );
    return new Set(rows.map((r) => r.threadId!).filter((id) => threadIds.includes(id)));
  }

  // Batch: get like counts for a list of thread IDs
  async getThreadLikeCounts(threadIds: string[]): Promise<Map<string, number>> {
    if (threadIds.length === 0) return new Map();
    const rows = await db
      .select({ threadId: likes.threadId, total: count() })
      .from(likes)
      .where(
        and(
          isNotNull(likes.threadId),
          isNull(likes.postId)
        )
      )
      .groupBy(likes.threadId);

    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.threadId !== null && threadIds.includes(row.threadId)) {
        map.set(row.threadId, row.total);
      }
    }
    return map;
  }

  // --- Post Likes ---
  async findPostLike(userId: string, postId: string) {
    const [row] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return row;
  }

  async addPostLike(userId: string, postId: string) {
    await db.insert(likes).values({ userId, postId }).onConflictDoNothing();
  }

  async removePostLike(userId: string, postId: string) {
    await db.delete(likes).where(
      and(eq(likes.userId, userId), eq(likes.postId, postId))
    );
  }

  async countPostLikes(postId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(likes)
      .where(and(eq(likes.postId, postId), isNull(likes.threadId)));
    return row?.total ?? 0;
  }

  // Batch: get like counts for a list of post IDs
  async getPostLikeCounts(postIds: string[]): Promise<Map<string, number>> {
    if (postIds.length === 0) return new Map();
    const rows = await db
      .select({ postId: likes.postId, total: count() })
      .from(likes)
      .where(
        and(
          isNotNull(likes.postId),
          isNull(likes.threadId)
        )
      )
      .groupBy(likes.postId);

    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.postId !== null && postIds.includes(row.postId)) {
        map.set(row.postId, row.total);
      }
    }
    return map;
  }

  // Batch: get which posts the user has liked
  async getPostLikesForUser(userId: string, postIds: string[]): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const rows = await db
      .select({ postId: likes.postId })
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          isNotNull(likes.postId),
          isNull(likes.threadId)
        )
      );
    return new Set(rows.map((r) => r.postId!).filter((id) => postIds.includes(id)));
  }
}

export const likeRepository = new LikeRepository();
