import { and, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export type UserInsertType = typeof users.$inferInsert;
export type UserSelectType = typeof users.$inferSelect;

export class UserRepository {
  async create(userData: UserInsertType): Promise<UserSelectType> {
    const [user] = await db.insert(users).values(userData).returning();
    return user!;
  }

  async findByEmail(email: string): Promise<UserSelectType | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async findById(id: string): Promise<UserSelectType | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async suggestByName(q: string, limit = 8) {
    const term = q.trim();
    if (!term) return [];
    return db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        tier: users.tier,
      })
      .from(users)
      .where(and(eq(users.isBanned, false), ilike(users.name, `%${term}%`)))
      .orderBy(sql`length(${users.name})`)
      .limit(limit);
  }

  async update(id: string, data: Partial<UserInsertType>): Promise<UserSelectType | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }
}

export const userRepository = new UserRepository();
