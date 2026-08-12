import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { threadReads } from '../db/schema.js';

export class ThreadReadRepository {
  /** Upsert last_read_at for (user, thread). */
  async upsert(userId: string, threadId: string, at: Date = new Date()): Promise<void> {
    await db
      .insert(threadReads)
      .values({ userId, threadId, lastReadAt: at })
      .onConflictDoUpdate({
        target: [threadReads.userId, threadReads.threadId],
        set: { lastReadAt: at },
      });
  }

  /** Map threadId → lastReadAt for a batch (for list enrichment). */
  async getLastReadMap(userId: string, threadIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>();
    if (threadIds.length === 0) return map;

    const rows = await db
      .select({
        threadId: threadReads.threadId,
        lastReadAt: threadReads.lastReadAt,
      })
      .from(threadReads)
      .where(and(eq(threadReads.userId, userId), inArray(threadReads.threadId, threadIds)));

    for (const r of rows) {
      map.set(r.threadId, r.lastReadAt);
    }
    return map;
  }
}

export const threadReadRepository = new ThreadReadRepository();
