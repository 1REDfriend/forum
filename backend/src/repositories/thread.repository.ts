import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { threads, users, forums } from '../db/schema.js';

export type ThreadInsertType = typeof threads.$inferInsert;
export type ThreadSelectType = typeof threads.$inferSelect;

export class ThreadRepository {
  async create(threadData: ThreadInsertType): Promise<ThreadSelectType> {
    const [thread] = await db.insert(threads).values(threadData).returning();
    return thread!;
  }

  async findAll() {
    return await db.select({
      id: threads.id,
      title: threads.title,
      content: threads.content,
      createdAt: threads.createdAt,
      author: {
        id: users.id,
        name: users.name,
      },
      forum: {
        id: forums.id,
        name: forums.name,
      }
    })
    .from(threads)
    .innerJoin(users, eq(threads.authorId, users.id))
    .innerJoin(forums, eq(threads.forumId, forums.id));
  }

  async findById(id: number) {
    const [thread] = await db.select({
      id: threads.id,
      title: threads.title,
      content: threads.content,
      createdAt: threads.createdAt,
      author: {
        id: users.id,
        name: users.name,
      },
      forum: {
        id: forums.id,
        name: forums.name,
      }
    })
    .from(threads)
    .innerJoin(users, eq(threads.authorId, users.id))
    .innerJoin(forums, eq(threads.forumId, forums.id))
    .where(eq(threads.id, id));
    
    return thread;
  }
}

export const threadRepository = new ThreadRepository();
