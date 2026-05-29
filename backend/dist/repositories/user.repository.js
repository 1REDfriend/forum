import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
export class UserRepository {
    async create(userData) {
        const [user] = await db.insert(users).values(userData).returning();
        return user;
    }
    async findByEmail(email) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user;
    }
    async findById(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async update(id, data) {
        const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
        return user;
    }
}
export const userRepository = new UserRepository();
//# sourceMappingURL=user.repository.js.map