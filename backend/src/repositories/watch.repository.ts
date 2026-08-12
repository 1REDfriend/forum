import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { threadWatches } from '../db/schema.js';

export class WatchRepository {
  async isWatching(userId: string, threadId: string): Promise<boolean> {
    const [row] = await db
      .select({ userId: threadWatches.userId })
      .from(threadWatches)
      .where(and(eq(threadWatches.userId, userId), eq(threadWatches.threadId, threadId)))
      .limit(1);
    return !!row;
  }

  async watch(userId: string, threadId: string) {
    await db.insert(threadWatches).values({ userId, threadId }).onConflictDoNothing();
  }

  async unwatch(userId: string, threadId: string) {
    await db
      .delete(threadWatches)
      .where(and(eq(threadWatches.userId, userId), eq(threadWatches.threadId, threadId)));
  }

  async listWatcherIds(threadId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: threadWatches.userId })
      .from(threadWatches)
      .where(eq(threadWatches.threadId, threadId));
    return rows.map((r) => r.userId);
  }
}

export const watchRepository = new WatchRepository();
