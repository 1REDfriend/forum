import { threads } from '../db/schema.js';
export type ThreadInsertType = typeof threads.$inferInsert;
export type ThreadSelectType = typeof threads.$inferSelect;
export declare class ThreadRepository {
    create(threadData: ThreadInsertType): Promise<ThreadSelectType>;
    findAll(): Promise<{
        id: number;
        title: string;
        content: string;
        isPinned: boolean;
        isLocked: boolean;
        createdAt: Date;
        updatedAt: Date;
        author: {
            id: number;
            name: string;
        };
        forum: {
            id: number;
            name: string;
        };
    }[]>;
    findById(id: number): Promise<{
        id: number;
        title: string;
        content: string;
        isPinned: boolean;
        isLocked: boolean;
        createdAt: Date;
        updatedAt: Date;
        author: {
            id: number;
            name: string;
        };
        forum: {
            id: number;
            name: string;
        };
    } | undefined>;
    findRawById(id: number): Promise<ThreadSelectType | undefined>;
    findByForumId(forumId: number, page: number, limit: number): Promise<{
        replyCount: number;
        lastPostAt: string | null;
        lastPostAuthor: string | null;
        id: number;
        title: string;
        content: string;
        isPinned: boolean;
        isLocked: boolean;
        createdAt: Date;
        updatedAt: Date;
        author: {
            id: number;
            name: string;
        };
        forum: {
            id: number;
            name: string;
        };
    }[]>;
    countByForumId(forumId: number): Promise<number>;
    update(id: number, data: Partial<ThreadInsertType>): Promise<ThreadSelectType | undefined>;
    delete(id: number): Promise<void>;
}
export declare const threadRepository: ThreadRepository;
//# sourceMappingURL=thread.repository.d.ts.map