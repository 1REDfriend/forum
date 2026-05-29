import type { CreateThreadDTO, UpdateThreadDTO } from '../types/index.js';
export declare class ThreadService {
    getAllThreads(): Promise<{
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
    getThreadById(id: number, userId?: number): Promise<{
        likeCount: number;
        isLikedByMe: boolean;
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
    }>;
    getThreadsByForumId(forumId: number, page: number, limit: number, userId?: number): Promise<{
        data: {
            likeCount: number;
            isLikedByMe: boolean;
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
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    createThread(userId: number, data: CreateThreadDTO): Promise<{
        id: number;
        createdAt: Date;
        title: string;
        content: string;
        authorId: number;
        forumId: number;
        isPinned: boolean;
        isLocked: boolean;
        updatedAt: Date;
    }>;
    updateThread(userId: number, threadId: number, data: UpdateThreadDTO): Promise<{
        id: number;
        createdAt: Date;
        title: string;
        content: string;
        authorId: number;
        forumId: number;
        isPinned: boolean;
        isLocked: boolean;
        updatedAt: Date;
    } | undefined>;
    deleteThread(userId: number, threadId: number): Promise<void>;
    pinThread(userId: number, threadId: number): Promise<{
        id: number;
        createdAt: Date;
        title: string;
        content: string;
        authorId: number;
        forumId: number;
        isPinned: boolean;
        isLocked: boolean;
        updatedAt: Date;
    } | undefined>;
    lockThread(userId: number, threadId: number): Promise<{
        id: number;
        createdAt: Date;
        title: string;
        content: string;
        authorId: number;
        forumId: number;
        isPinned: boolean;
        isLocked: boolean;
        updatedAt: Date;
    } | undefined>;
}
export declare const threadService: ThreadService;
//# sourceMappingURL=thread.service.d.ts.map