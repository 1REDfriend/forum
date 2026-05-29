import { posts } from '../db/schema.js';
export type PostInsertType = typeof posts.$inferInsert;
export type PostSelectType = typeof posts.$inferSelect;
export declare class PostRepository {
    create(postData: PostInsertType): Promise<PostSelectType>;
    findByThreadId(threadId: number, page?: number, limit?: number): Promise<{
        id: number;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        author: {
            id: number;
            name: string;
        };
    }[]>;
    countByThreadId(threadId: number): Promise<number>;
    findById(id: number): Promise<PostSelectType | undefined>;
    findRawById(id: number): Promise<PostSelectType | undefined>;
    update(id: number, data: Partial<PostInsertType>): Promise<PostSelectType | undefined>;
    delete(id: number): Promise<void>;
}
export declare const postRepository: PostRepository;
//# sourceMappingURL=post.repository.d.ts.map