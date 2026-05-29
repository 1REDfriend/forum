import type { CreatePostDTO, UpdatePostDTO } from '../types/index.js';
export declare class PostService {
    getPostsByThreadId(threadId: number, page?: number, limit?: number, userId?: number): Promise<{
        data: {
            likeCount: number;
            isLikedByMe: boolean;
            id: number;
            content: string;
            createdAt: Date;
            updatedAt: Date;
            author: {
                id: number;
                name: string;
            };
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    createPost(userId: number, data: CreatePostDTO): Promise<{
        id: number;
        createdAt: Date;
        content: string;
        authorId: number;
        updatedAt: Date;
        threadId: number;
    }>;
    updatePost(userId: number, postId: number, data: UpdatePostDTO): Promise<{
        id: number;
        createdAt: Date;
        content: string;
        authorId: number;
        updatedAt: Date;
        threadId: number;
    } | undefined>;
    deletePost(userId: number, postId: number): Promise<void>;
}
export declare const postService: PostService;
//# sourceMappingURL=post.service.d.ts.map