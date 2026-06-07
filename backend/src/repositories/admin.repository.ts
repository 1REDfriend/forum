import { eq, desc, asc, ilike, count, sql, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, forums, threads, posts } from '../db/schema.js';

export class AdminRepository {
  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getSystemStats() {
    const [userCount] = await db.select({ total: count() }).from(users);
    const [forumCount] = await db.select({ total: count() }).from(forums);
    const [threadCount] = await db.select({ total: count() }).from(threads);
    const [postCount] = await db.select({ total: count() }).from(posts);

    // New users in last 7 days
    const [newUsers] = await db
      .select({ total: count() })
      .from(users)
      .where(sql`users.created_at > NOW() - INTERVAL '7 days'`);

    // New threads in last 7 days
    const [newThreads] = await db
      .select({ total: count() })
      .from(threads)
      .where(sql`threads.created_at > NOW() - INTERVAL '7 days'`);

    // New posts in last 7 days
    const [newPosts] = await db
      .select({ total: count() })
      .from(posts)
      .where(sql`posts.created_at > NOW() - INTERVAL '7 days'`);

    return {
      totalUsers: userCount?.total ?? 0,
      totalForums: forumCount?.total ?? 0,
      totalThreads: threadCount?.total ?? 0,
      totalPosts: postCount?.total ?? 0,
      newUsersWeek: newUsers?.total ?? 0,
      newThreadsWeek: newThreads?.total ?? 0,
      newPostsWeek: newPosts?.total ?? 0,
    };
  }

  // ─── Recent Activity ────────────────────────────────────────────────────────

  async getRecentActivity(limit = 20) {
    // Recent threads
    const recentThreads = await db.select({
      type: sql<string>`'thread'`,
      id: threads.id,
      title: threads.title,
      authorName: users.name,
      authorId: users.id,
      forumName: forums.name,
      forumId: forums.id,
      createdAt: threads.createdAt,
    })
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .innerJoin(forums, eq(threads.forumId, forums.id))
      .orderBy(desc(threads.createdAt))
      .limit(limit);

    // Recent posts
    const recentPosts = await db.select({
      type: sql<string>`'post'`,
      id: posts.id,
      title: sql<string>`''`,
      authorName: users.name,
      authorId: users.id,
      forumName: sql<string>`''`,
      forumId: threads.forumId,
      threadId: posts.threadId,
      threadTitle: threads.title,
      createdAt: posts.createdAt,
    })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(threads, eq(posts.threadId, threads.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    // Merge and sort
    const combined = [
      ...recentThreads.map(t => ({ ...t, threadId: null, threadTitle: null })),
      ...recentPosts,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combined.slice(0, limit);
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async getAllUsers(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;

    const baseQuery = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      tier: users.tier,
      authProvider: users.authProvider,
      avatar: users.avatar,
      createdAt: users.createdAt,
      threadCount: sql<number>`(SELECT COUNT(*) FROM threads WHERE threads.author_id = users.id)::int`,
      postCount: sql<number>`(SELECT COUNT(*) FROM posts WHERE posts.author_id = users.id)::int`,
      badgeKeys: sql<string[]>`COALESCE((SELECT json_agg(ub.badge_key) FROM user_badges ub WHERE ub.user_id = users.id), '[]'::json)`,
    }).from(users);

    const filteredQuery = search
      ? baseQuery.where(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )
        )
      : baseQuery;

    const data = await filteredQuery
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ total: count() })
      .from(users)
      .where(
        search
          ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
          : undefined
      );

    return { data, total: countResult?.total ?? 0 };
  }

  async updateUserRole(id: string, role: 'user' | 'admin') {
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserTier(id: string, tier: string) {
    const [user] = await db
      .update(users)
      .set({ tier })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }

  // ─── Forums ─────────────────────────────────────────────────────────────────

  async getAllForumsAdmin(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const data = await db.select({
      id: forums.id,
      name: forums.name,
      description: forums.description,
      createdBy: forums.createdBy,
      createdAt: forums.createdAt,
      threadCount: sql<number>`(SELECT COUNT(*) FROM threads WHERE threads.forum_id = forums.id)::int`,
      postCount: sql<number>`(SELECT COUNT(*) FROM posts JOIN threads ON posts.thread_id = threads.id WHERE threads.forum_id = forums.id)::int`,
      creatorName: sql<string | null>`(SELECT users.name FROM users WHERE users.id = forums.created_by)`,
    })
      .from(forums)
      .orderBy(asc(forums.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db.select({ total: count() }).from(forums);

    return { data, total: countResult?.total ?? 0 };
  }

  // ─── Threads ────────────────────────────────────────────────────────────────

  async getAllThreadsAdmin(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;

    const baseQuery = db.select({
      id: threads.id,
      title: threads.title,
      isPinned: threads.isPinned,
      isLocked: threads.isLocked,
      createdAt: threads.createdAt,
      authorId: users.id,
      authorName: users.name,
      forumId: forums.id,
      forumName: forums.name,
      replyCount: sql<number>`(SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id)::int`,
    })
      .from(threads)
      .innerJoin(users, eq(threads.authorId, users.id))
      .innerJoin(forums, eq(threads.forumId, forums.id));

    const filteredQuery = search
      ? baseQuery.where(ilike(threads.title, `%${search}%`))
      : baseQuery;

    const data = await filteredQuery
      .orderBy(desc(threads.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ total: count() })
      .from(threads)
      .where(search ? ilike(threads.title, `%${search}%`) : undefined);

    return { data, total: countResult?.total ?? 0 };
  }

  // ─── Posts ──────────────────────────────────────────────────────────────────

  async getAllPostsAdmin(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const data = await db.select({
      id: posts.id,
      content: sql<string>`LEFT(posts.content, 200)`,
      createdAt: posts.createdAt,
      authorId: users.id,
      authorName: users.name,
      threadId: threads.id,
      threadTitle: threads.title,
      forumId: threads.forumId,
    })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(threads, eq(posts.threadId, threads.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db.select({ total: count() }).from(posts);

    return { data, total: countResult?.total ?? 0 };
  }
}

export const adminRepository = new AdminRepository();
