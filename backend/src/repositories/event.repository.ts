import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { newId } from '../db/ids.js';

export class EventRepository {
  async list(from?: Date, to?: Date) {
    const parts = [];
    if (from) parts.push(gte(events.startsAt, from));
    if (to) parts.push(lte(events.startsAt, to));
    if (parts.length === 0) {
      return db.select().from(events).orderBy(asc(events.startsAt)).limit(100);
    }
    return db
      .select()
      .from(events)
      .where(and(...parts))
      .orderBy(asc(events.startsAt))
      .limit(100);
  }

  async create(data: {
    title: string;
    description?: string | null;
    startsAt: Date;
    endsAt?: Date | null;
    createdBy?: string | null;
  }) {
    const [row] = await db
      .insert(events)
      .values({
        id: newId(),
        title: data.title,
        description: data.description ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt ?? null,
        createdBy: data.createdBy ?? null,
      })
      .returning();
    return row!;
  }

  async remove(id: string) {
    await db.delete(events).where(eq(events.id, id));
  }
}

export const eventRepository = new EventRepository();
