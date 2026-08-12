import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conversations, directMessages, users } from '../db/schema.js';
import { newId } from '../db/ids.js';

/** Canonical pair order so A↔B is unique. */
export function pairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export class DmRepository {
  async getOrCreateConversation(userId: string, otherId: string) {
    const [userAId, userBId] = pairIds(userId, otherId);
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userAId, userAId), eq(conversations.userBId, userBId)))
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(conversations)
      .values({ id: newId(), userAId, userBId })
      .returning();
    return created!;
  }

  async listConversations(userId: string) {
    return db
      .select()
      .from(conversations)
      .where(or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async findConversation(id: string) {
    const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return row;
  }

  async listMessages(conversationId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    return db
      .select({
        id: directMessages.id,
        body: directMessages.body,
        senderId: directMessages.senderId,
        readAt: directMessages.readAt,
        createdAt: directMessages.createdAt,
        senderName: users.name,
        senderAvatar: users.avatar,
      })
      .from(directMessages)
      .innerJoin(users, eq(directMessages.senderId, users.id))
      .where(eq(directMessages.conversationId, conversationId))
      .orderBy(desc(directMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async sendMessage(conversationId: string, senderId: string, body: string) {
    const [msg] = await db
      .insert(directMessages)
      .values({ id: newId(), conversationId, senderId, body })
      .returning();
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
    return msg!;
  }

  async markRead(conversationId: string, userId: string) {
    await db
      .update(directMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(directMessages.conversationId, conversationId),
          sql`${directMessages.senderId} <> ${userId}`,
          sql`${directMessages.readAt} IS NULL`,
        ),
      );
  }

  async unreadCount(userId: string): Promise<number> {
    const res: any = await db.execute(sql`
      SELECT COUNT(*)::int AS c
      FROM direct_messages dm
      JOIN conversations c ON c.id = dm.conversation_id
      WHERE dm.sender_id <> ${userId}
        AND dm.read_at IS NULL
        AND (c.user_a_id = ${userId} OR c.user_b_id = ${userId})
    `);
    const row = (res.rows ?? res)[0] ?? {};
    return Number(row.c ?? 0);
  }
}

export const dmRepository = new DmRepository();
