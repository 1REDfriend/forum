import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { forumModerators, users } from '../db/schema.js';

export class ModeratorRepository {
  async isModerator(forumId: string, userId: string): Promise<boolean> {
    const [row] = await db
      .select({ userId: forumModerators.userId })
      .from(forumModerators)
      .where(and(eq(forumModerators.forumId, forumId), eq(forumModerators.userId, userId)))
      .limit(1);
    return !!row;
  }

  async listForForum(forumId: string) {
    return db
      .select({
        userId: users.id,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
      })
      .from(forumModerators)
      .innerJoin(users, eq(forumModerators.userId, users.id))
      .where(eq(forumModerators.forumId, forumId));
  }

  async add(forumId: string, userId: string) {
    await db.insert(forumModerators).values({ forumId, userId }).onConflictDoNothing();
  }

  async remove(forumId: string, userId: string) {
    await db
      .delete(forumModerators)
      .where(and(eq(forumModerators.forumId, forumId), eq(forumModerators.userId, userId)));
  }

  async listForumIdsForUser(userId: string): Promise<string[]> {
    const rows = await db
      .select({ forumId: forumModerators.forumId })
      .from(forumModerators)
      .where(eq(forumModerators.userId, userId));
    return rows.map((r) => r.forumId);
  }
}

export const moderatorRepository = new ModeratorRepository();
