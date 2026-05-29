import { eq, and, isNull, isNotNull, count, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { likes } from '../db/schema.js';
export class LikeRepository {
    // --- Thread Likes ---
    async findThreadLike(userId, threadId) {
        const [row] = await db
            .select()
            .from(likes)
            .where(and(eq(likes.userId, userId), eq(likes.threadId, threadId)));
        return row;
    }
    async addThreadLike(userId, threadId) {
        await db.insert(likes).values({ userId, threadId }).onConflictDoNothing();
    }
    async removeThreadLike(userId, threadId) {
        await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.threadId, threadId)));
    }
    async countThreadLikes(threadId) {
        const [row] = await db
            .select({ total: count() })
            .from(likes)
            .where(and(eq(likes.threadId, threadId), isNull(likes.postId)));
        return row?.total ?? 0;
    }
    async getThreadLikesForUser(userId, threadIds) {
        if (threadIds.length === 0)
            return new Set();
        const rows = await db
            .select({ threadId: likes.threadId })
            .from(likes)
            .where(and(eq(likes.userId, userId), isNotNull(likes.threadId), isNull(likes.postId)));
        return new Set(rows.map((r) => r.threadId).filter((id) => threadIds.includes(id)));
    }
    // Batch: get like counts for a list of thread IDs
    async getThreadLikeCounts(threadIds) {
        if (threadIds.length === 0)
            return new Map();
        const rows = await db
            .select({ threadId: likes.threadId, total: count() })
            .from(likes)
            .where(and(isNotNull(likes.threadId), isNull(likes.postId)))
            .groupBy(likes.threadId);
        const map = new Map();
        for (const row of rows) {
            if (row.threadId !== null && threadIds.includes(row.threadId)) {
                map.set(row.threadId, row.total);
            }
        }
        return map;
    }
    // --- Post Likes ---
    async findPostLike(userId, postId) {
        const [row] = await db
            .select()
            .from(likes)
            .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
        return row;
    }
    async addPostLike(userId, postId) {
        await db.insert(likes).values({ userId, postId }).onConflictDoNothing();
    }
    async removePostLike(userId, postId) {
        await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    }
    async countPostLikes(postId) {
        const [row] = await db
            .select({ total: count() })
            .from(likes)
            .where(and(eq(likes.postId, postId), isNull(likes.threadId)));
        return row?.total ?? 0;
    }
    // Batch: get like counts for a list of post IDs
    async getPostLikeCounts(postIds) {
        if (postIds.length === 0)
            return new Map();
        const rows = await db
            .select({ postId: likes.postId, total: count() })
            .from(likes)
            .where(and(isNotNull(likes.postId), isNull(likes.threadId)))
            .groupBy(likes.postId);
        const map = new Map();
        for (const row of rows) {
            if (row.postId !== null && postIds.includes(row.postId)) {
                map.set(row.postId, row.total);
            }
        }
        return map;
    }
    // Batch: get which posts the user has liked
    async getPostLikesForUser(userId, postIds) {
        if (postIds.length === 0)
            return new Set();
        const rows = await db
            .select({ postId: likes.postId })
            .from(likes)
            .where(and(eq(likes.userId, userId), isNotNull(likes.postId), isNull(likes.threadId)));
        return new Set(rows.map((r) => r.postId).filter((id) => postIds.includes(id)));
    }
}
export const likeRepository = new LikeRepository();
//# sourceMappingURL=like.repository.js.map