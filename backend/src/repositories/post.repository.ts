import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { posts, users } from '../db/schema.js';

export type PostInsertType = typeof posts.$inferInsert;
export type PostSelectType = typeof posts.$inferSelect;

export class PostRepository {
  async create(postData: PostInsertType): Promise<PostSelectType> {
    const [post] = await db.insert(posts).values(postData).returning();
    return post!;
  }

  async findByThreadId(threadId: number) {
    return await db.select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        name: users.name,
      }
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.threadId, threadId));
  }
}

export const postRepository = new PostRepository();
