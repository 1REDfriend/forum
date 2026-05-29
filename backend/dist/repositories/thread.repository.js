import { eq, desc, count, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { threads, users, forums } from '../db/schema.js';
// Shared select fields for thread queries with joins
const threadWithJoinsSelect = {
    id: threads.id,
    title: threads.title,
    content: threads.content,
    isPinned: threads.isPinned,
    isLocked: threads.isLocked,
    createdAt: threads.createdAt,
    updatedAt: threads.updatedAt,
    author: {
        id: users.id,
        name: users.name,
    },
    forum: {
        id: forums.id,
        name: forums.name,
    },
};
export class ThreadRepository {
    async create(threadData) {
        const [thread] = await db.insert(threads).values(threadData).returning();
        return thread;
    }
    async findAll() {
        return await db.select(threadWithJoinsSelect)
            .from(threads)
            .innerJoin(users, eq(threads.authorId, users.id))
            .innerJoin(forums, eq(threads.forumId, forums.id));
    }
    async findById(id) {
        const [thread] = await db.select(threadWithJoinsSelect)
            .from(threads)
            .innerJoin(users, eq(threads.authorId, users.id))
            .innerJoin(forums, eq(threads.forumId, forums.id))
            .where(eq(threads.id, id));
        return thread;
    }
    async findRawById(id) {
        const [thread] = await db.select().from(threads).where(eq(threads.id, id));
        return thread;
    }
    async findByForumId(forumId, page, limit) {
        const offset = (page - 1) * limit;
        return await db.select({
            ...threadWithJoinsSelect,
            replyCount: sql `(SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id)::int`,
            lastPostAt: sql `(SELECT posts.created_at FROM posts WHERE posts.thread_id = threads.id ORDER BY posts.created_at DESC LIMIT 1)`,
            lastPostAuthor: sql `(SELECT users.name FROM users JOIN posts ON users.id = posts.author_id WHERE posts.thread_id = threads.id ORDER BY posts.created_at DESC LIMIT 1)`,
        })
            .from(threads)
            .innerJoin(users, eq(threads.authorId, users.id))
            .innerJoin(forums, eq(threads.forumId, forums.id))
            .where(eq(threads.forumId, forumId))
            .orderBy(desc(threads.isPinned), desc(threads.createdAt))
            .limit(limit)
            .offset(offset);
    }
    async countByForumId(forumId) {
        const [result] = await db.select({ total: count() }).from(threads).where(eq(threads.forumId, forumId));
        return result?.total ?? 0;
    }
    async update(id, data) {
        const [thread] = await db.update(threads)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(threads.id, id))
            .returning();
        return thread;
    }
    async delete(id) {
        await db.delete(threads).where(eq(threads.id, id));
    }
}
export const threadRepository = new ThreadRepository();
//# sourceMappingURL=thread.repository.js.map