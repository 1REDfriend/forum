import { eq, asc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { posts, users } from '../db/schema.js';

export type PostInsertType = typeof posts.$inferInsert;
export type PostSelectType = typeof posts.$inferSelect;

export class PostRepository {
  async create(postData: PostInsertType): Promise<PostSelectType> {
    const [post] = await db.insert(posts).values(postData).returning();
    return post!;
  }

  async findByThreadId(threadId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    return await db.select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        banner: users.banner,
        bio: users.bio,
        role: users.role,
        tier: users.tier,
      }
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.threadId, threadId))
    .orderBy(asc(posts.createdAt))
    .limit(limit)
    .offset(offset);
  }

  async countByThreadId(threadId: string): Promise<number> {
    const [result] = await db.select({ total: count() }).from(posts).where(eq(posts.threadId, threadId));
    return result?.total ?? 0;
  }

  async findById(id: string): Promise<PostSelectType | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  // Alias for consistency with ThreadRepository
  async findRawById(id: string): Promise<PostSelectType | undefined> {
    return this.findById(id);
  }

  async update(id: string, data: Partial<PostInsertType>): Promise<PostSelectType | undefined> {
    const [post] = await db.update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async delete(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }
}

export const postRepository = new PostRepository();
