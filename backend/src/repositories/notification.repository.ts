import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications, users } from '../db/schema.js';

export type NotificationInsert = typeof notifications.$inferInsert;
export type NotificationSelect = typeof notifications.$inferSelect;

export class NotificationRepository {
  async create(data: NotificationInsert): Promise<NotificationSelect> {
    const [row] = await db.insert(notifications).values(data).returning();
    return row!;
  }

  async listForUser(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    return db
      .select({
        id: notifications.id,
        type: notifications.type,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        threadId: notifications.threadId,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        actor: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async countForUser(userId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    return row?.total ?? 0;
  }

  async countUnread(userId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return row?.total ?? 0;
  }

  async markRead(userId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const updated = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.id, ids),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });
    return updated.length;
  }

  async markAllRead(userId: string): Promise<number> {
    const updated = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .returning({ id: notifications.id });
    return updated.length;
  }
}

export const notificationRepository = new NotificationRepository();
