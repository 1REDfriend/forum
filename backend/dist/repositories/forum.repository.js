import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { forums, threads, posts } from '../db/schema.js';
export class ForumRepository {
    async create(forumData) {
        const [forum] = await db.insert(forums).values(forumData).returning();
        return forum;
    }
    async findAll() {
        return await db.select().from(forums);
    }
    async findById(id) {
        const [forum] = await db.select().from(forums).where(eq(forums.id, id));
        return forum;
    }
    async findAllWithStats() {
        const result = await db.select({
            id: forums.id,
            name: forums.name,
            description: forums.description,
            createdBy: forums.createdBy,
            createdAt: forums.createdAt,
            threadCount: sql `(SELECT COUNT(*) FROM threads WHERE threads.forum_id = forums.id)::int`,
            postCount: sql `(SELECT COUNT(*) FROM posts JOIN threads ON posts.thread_id = threads.id WHERE threads.forum_id = forums.id)::int`,
            lastPostAt: sql `(SELECT posts.created_at FROM posts JOIN threads ON posts.thread_id = threads.id WHERE threads.forum_id = forums.id ORDER BY posts.created_at DESC LIMIT 1)`,
            lastPostAuthor: sql `(SELECT users.name FROM users JOIN posts ON users.id = posts.author_id JOIN threads ON posts.thread_id = threads.id WHERE threads.forum_id = forums.id ORDER BY posts.created_at DESC LIMIT 1)`,
        }).from(forums);
        return result;
    }
    async update(id, data) {
        const [forum] = await db.update(forums).set(data).where(eq(forums.id, id)).returning();
        return forum;
    }
    async delete(id) {
        await db.delete(forums).where(eq(forums.id, id));
    }
}
export const forumRepository = new ForumRepository();
//# sourceMappingURL=forum.repository.js.map