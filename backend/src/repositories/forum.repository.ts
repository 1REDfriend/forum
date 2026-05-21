import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { forums } from '../db/schema.js';

export type ForumInsertType = typeof forums.$inferInsert;
export type ForumSelectType = typeof forums.$inferSelect;

export class ForumRepository {
  async create(forumData: ForumInsertType): Promise<ForumSelectType> {
    const [forum] = await db.insert(forums).values(forumData).returning();
    return forum!;
  }

  async findAll() {
    return await db.select().from(forums);
  }

  async findById(id: number) {
    const [forum] = await db.select().from(forums).where(eq(forums.id, id));
    return forum;
  }
}

export const forumRepository = new ForumRepository();
