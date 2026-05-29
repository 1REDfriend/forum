import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { forums, threads, posts } from '../db/schema.js';

export type ForumInsertType = typeof forums.$inferInsert;
export type ForumSelectType = typeof forums.$inferSelect;

export class ForumRepository {
  async create(forumData: ForumInsertType): Promise<ForumSelectType> {
    const [forum] = await db.insert(forums).values(forumData).returning();
    return forum!;
  }

  async findAll() {
    return await db.select().from(forums);
  }

  async findById(id: number) {
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
      threadCount: sql<number>`(SELECT COUNT(*) FROM threads WHERE threads.forum_id = forums.id)::int`,
      postCount: sql<number>`(SELECT COUNT(*) FROM posts JOIN threads ON posts.thread_id = threads.id WHERE threads.forum_id = forums.id)::int`,
      lastPostAt: sql<string | null>`(SELECT posts.created_at FROM posts JOIN threads ON posts.thread_id = threads.id WHERE threads.forum_id = forums.id ORDER BY posts.created_at DESC LIMIT 1)`,
      lastPostAuthor: sql<string | null>`(SELECT users.name FROM users JOIN posts ON users.id = posts.author_id JOIN threads ON posts.thread_id = threads.id WHERE threads.forum_id = forums.id ORDER BY posts.created_at DESC LIMIT 1)`,
    }).from(forums);
    return result;
  }

  async update(id: number, data: Partial<ForumInsertType>): Promise<ForumSelectType | undefined> {
    const [forum] = await db.update(forums).set(data).where(eq(forums.id, id)).returning();
    return forum;
  }

  async delete(id: number): Promise<void> {
    await db.delete(forums).where(eq(forums.id, id));
  }
}

export const forumRepository = new ForumRepository();
