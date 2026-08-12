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

  async findById(id: string) {
    const [forum] = await db.select().from(forums).where(eq(forums.id, id));
    return forum;
  }

  async findAllWithStats() {
    // Last activity = most recent post in the forum, else most recent thread create.
    const lastActivityThreadId = sql<string | null>`(
      COALESCE(
        (SELECT threads.id FROM posts
          JOIN threads ON posts.thread_id = threads.id
          WHERE threads.forum_id = forums.id
          ORDER BY posts.created_at DESC LIMIT 1),
        (SELECT threads.id FROM threads
          WHERE threads.forum_id = forums.id
          ORDER BY threads.created_at DESC LIMIT 1)
      )
    )`;
    const lastActivityThreadTitle = sql<string | null>`(
      COALESCE(
        (SELECT threads.title FROM posts
          JOIN threads ON posts.thread_id = threads.id
          WHERE threads.forum_id = forums.id
          ORDER BY posts.created_at DESC LIMIT 1),
        (SELECT threads.title FROM threads
          WHERE threads.forum_id = forums.id
          ORDER BY threads.created_at DESC LIMIT 1)
      )
    )`;
    const lastActivityAt = sql<string | null>`(
      COALESCE(
        (SELECT posts.created_at FROM posts
          JOIN threads ON posts.thread_id = threads.id
          WHERE threads.forum_id = forums.id
          ORDER BY posts.created_at DESC LIMIT 1),
        (SELECT threads.created_at FROM threads
          WHERE threads.forum_id = forums.id
          ORDER BY threads.created_at DESC LIMIT 1)
      )
    )`;
    const lastAuthorName = sql<string | null>`(
      COALESCE(
        (SELECT users.name FROM users
          JOIN posts ON users.id = posts.author_id
          JOIN threads ON posts.thread_id = threads.id
          WHERE threads.forum_id = forums.id
          ORDER BY posts.created_at DESC LIMIT 1),
        (SELECT users.name FROM users
          JOIN threads ON users.id = threads.author_id
          WHERE threads.forum_id = forums.id
          ORDER BY threads.created_at DESC LIMIT 1)
      )
    )`;

    const result = await db.select({
      id: forums.id,
      name: forums.name,
      description: forums.description,
      createdBy: forums.createdBy,
      postRoleMin: forums.postRoleMin,
      createdAt: forums.createdAt,
      threadCount: sql<number>`(SELECT COUNT(*) FROM threads WHERE threads.forum_id = forums.id)::int`,
      postCount: sql<number>`(SELECT COUNT(*) FROM posts JOIN threads ON posts.thread_id = threads.id WHERE threads.forum_id = forums.id)::int`,
      // Backward-compatible aliases (last post when present; else last thread activity)
      lastPostAt: lastActivityAt,
      lastPostAuthor: lastAuthorName,
      lastThreadId: lastActivityThreadId,
      lastThreadTitle: lastActivityThreadTitle,
    }).from(forums);
    return result;
  }

  async update(id: string, data: Partial<ForumInsertType>): Promise<ForumSelectType | undefined> {
    const [forum] = await db.update(forums).set(data).where(eq(forums.id, id)).returning();
    return forum;
  }

  async delete(id: string): Promise<void> {
    await db.delete(forums).where(eq(forums.id, id));
  }
}

export const forumRepository = new ForumRepository();
