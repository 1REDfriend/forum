import { forums } from '../db/schema.js';
export type ForumInsertType = typeof forums.$inferInsert;
export type ForumSelectType = typeof forums.$inferSelect;
export declare class ForumRepository {
    create(forumData: ForumInsertType): Promise<ForumSelectType>;
    findAll(): Promise<{
        id: number;
        name: string;
        description: string | null;
        createdBy: number | null;
        createdAt: Date;
    }[]>;
    findById(id: number): Promise<{
        id: number;
        name: string;
        description: string | null;
        createdBy: number | null;
        createdAt: Date;
    } | undefined>;
    findAllWithStats(): Promise<{
        id: number;
        name: string;
        description: string | null;
        createdBy: number | null;
        createdAt: Date;
        threadCount: number;
        postCount: number;
        lastPostAt: string | null;
        lastPostAuthor: string | null;
    }[]>;
    update(id: number, data: Partial<ForumInsertType>): Promise<ForumSelectType | undefined>;
    delete(id: number): Promise<void>;
}
export declare const forumRepository: ForumRepository;
//# sourceMappingURL=forum.repository.d.ts.map