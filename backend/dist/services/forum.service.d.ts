import type { CreateForumDTO, UpdateForumDTO } from '../types/index.js';
export declare class ForumService {
    getAllForums(): Promise<{
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
    getForumById(id: number): Promise<{
        id: number;
        name: string;
        description: string | null;
        createdBy: number | null;
        createdAt: Date;
    }>;
    createForum(userId: number, data: CreateForumDTO): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string | null;
        createdBy: number | null;
    }>;
    updateForum(userId: number, forumId: number, data: UpdateForumDTO): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        description: string | null;
        createdBy: number | null;
    } | undefined>;
    deleteForum(userId: number, forumId: number): Promise<void>;
}
export declare const forumService: ForumService;
//# sourceMappingURL=forum.service.d.ts.map