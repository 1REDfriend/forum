import { eq, desc, count, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { threads, users, forums } from '../db/schema.js';

export type ThreadInsertType = typeof threads.$inferInsert;
export type ThreadSelectType = typeof threads.$inferSelect;

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
    avatar: users.avatar,
    banner: users.banner,
    bio: users.bio,
    role: users.role,
    tier: users.tier,
  },
  forum: {
    id: forums.id,
    name: forums.name,
  },
};

export class ThreadRepository {
  async create(threadData: ThreadInsertType): Promise<ThreadSelectType> {
    const [thread] = await db.insert(threads).values(threadData).returning();
    return thread!;
  }

  async findAll() {
    return await db.select(threadWithJoinsSelect)
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .innerJoin(forums, eq(threads.forumId, forums.id));
  }

  async findById(id: string) {
    const [thread] = await db.select(threadWithJoinsSelect)
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .innerJoin(forums, eq(threads.forumId, forums.id))
      .where(eq(threads.id, id));

    return thread;
  }

  async findRawById(id: string): Promise<ThreadSelectType | undefined> {
    const [thread] = await db.select().from(threads).where(eq(threads.id, id));
    return thread;
  }

  async findByForumId(forumId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    return await db.select({
      ...threadWithJoinsSelect,
      replyCount: sql<number>`(SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id)::int`,
      lastPostAt: sql<string | null>`(SELECT posts.created_at FROM posts WHERE posts.thread_id = threads.id ORDER BY posts.created_at DESC LIMIT 1)`,
      lastPostAuthor: sql<string | null>`(SELECT users.name FROM users JOIN posts ON users.id = posts.author_id WHERE posts.thread_id = threads.id ORDER BY posts.created_at DESC LIMIT 1)`,
    })
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .innerJoin(forums, eq(threads.forumId, forums.id))
      .where(eq(threads.forumId, forumId))
      .orderBy(desc(threads.isPinned), desc(threads.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async countByForumId(forumId: string): Promise<number> {
    const [result] = await db.select({ total: count() }).from(threads).where(eq(threads.forumId, forumId));
    return result?.total ?? 0;
  }

  async update(id: string, data: Partial<ThreadInsertType>): Promise<ThreadSelectType | undefined> {
    const [thread] = await db.update(threads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(threads.id, id))
      .returning();
    return thread;
  }

  async delete(id: string): Promise<void> {
    await db.delete(threads).where(eq(threads.id, id));
  }
}

export const threadRepository = new ThreadRepository();
