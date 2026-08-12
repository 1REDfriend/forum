import { and, desc, eq, count, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { threads, users, forums } from '../db/schema.js';

export type ThreadInsertType = typeof threads.$inferInsert;
export type ThreadSelectType = typeof threads.$inferSelect;

export type ThreadListSort = 'newest' | 'recent_activity' | 'most_liked' | 'unanswered';
export type ThreadListFilter = 'all' | 'mine' | 'pinned';

export type FindByForumOptions = {
  sort?: ThreadListSort;
  filter?: ThreadListFilter;
  authorId?: string | undefined; // required when filter=mine
};

// Shared select fields for thread queries with joins
const threadWithJoinsSelect = {
  id: threads.id,
  title: threads.title,
  content: threads.content,
  isPinned: threads.isPinned,
  isLocked: threads.isLocked,
  isQa: threads.isQa,
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

const replyCountSql = sql<number>`(SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id)::int`;
const lastPostAtSql = sql<string | null>`(SELECT posts.created_at FROM posts WHERE posts.thread_id = threads.id ORDER BY posts.created_at DESC LIMIT 1)`;
const lastPostAuthorSql = sql<string | null>`(SELECT users.name FROM users JOIN posts ON users.id = posts.author_id WHERE posts.thread_id = threads.id ORDER BY posts.created_at DESC LIMIT 1)`;
const likeCountSql = sql<number>`(SELECT COUNT(*) FROM likes WHERE likes.thread_id = threads.id)::int`;
const lastActivitySql = sql`(SELECT COALESCE(
  (SELECT posts.created_at FROM posts WHERE posts.thread_id = threads.id ORDER BY posts.created_at DESC LIMIT 1),
  threads.created_at
))`;

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

  private buildWhere(forumId: string, opts: FindByForumOptions): SQL {
    const parts: SQL[] = [eq(threads.forumId, forumId)];
    if (opts.filter === 'pinned') {
      parts.push(eq(threads.isPinned, true));
    }
    if (opts.filter === 'mine' && opts.authorId) {
      parts.push(eq(threads.authorId, opts.authorId));
    }
    if (opts.sort === 'unanswered') {
      parts.push(sql`(SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id) = 0`);
    }
    return and(...parts)!;
  }

  async findByForumId(forumId: string, page: number, limit: number, opts: FindByForumOptions = {}) {
    const offset = (page - 1) * limit;
    const sort = opts.sort ?? 'newest';
    const where = this.buildWhere(forumId, opts);

    let orderBy: SQL[];
    switch (sort) {
      case 'recent_activity':
        orderBy = [desc(threads.isPinned), desc(lastActivitySql)];
        break;
      case 'most_liked':
        orderBy = [desc(threads.isPinned), desc(likeCountSql), desc(threads.createdAt)];
        break;
      case 'unanswered':
        orderBy = [desc(threads.isPinned), desc(threads.createdAt)];
        break;
      case 'newest':
      default:
        orderBy = [desc(threads.isPinned), desc(threads.createdAt)];
        break;
    }

    return await db.select({
      ...threadWithJoinsSelect,
      replyCount: replyCountSql,
      lastPostAt: lastPostAtSql,
      lastPostAuthor: lastPostAuthorSql,
    })
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .innerJoin(forums, eq(threads.forumId, forums.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);
  }

  async countByForumId(forumId: string, opts: FindByForumOptions = {}): Promise<number> {
    const where = this.buildWhere(forumId, opts);
    const [result] = await db.select({ total: count() }).from(threads).where(where);
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
