import { users } from '../db/schema.js';
export type UserInsertType = typeof users.$inferInsert;
export type UserSelectType = typeof users.$inferSelect;
export declare class UserRepository {
    create(userData: UserInsertType): Promise<UserSelectType>;
    findByEmail(email: string): Promise<UserSelectType | undefined>;
    findById(id: number): Promise<UserSelectType | undefined>;
    update(id: number, data: Partial<UserInsertType>): Promise<UserSelectType | undefined>;
}
export declare const userRepository: UserRepository;
//# sourceMappingURL=user.repository.d.ts.map