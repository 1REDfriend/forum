import { eq } from 'drizzle-orm';
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

  async findById(id: number): Promise<UserSelectType | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
}

export const userRepository = new UserRepository();
