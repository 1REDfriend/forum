export declare class AdminRepository {
    getSystemStats(): Promise<{
        totalUsers: number;
        totalForums: number;
        totalThreads: number;
        totalPosts: number;
        newUsersWeek: number;
        newThreadsWeek: number;
        newPostsWeek: number;
    }>;
    getRecentActivity(limit?: number): Promise<({
        type: string;
        id: number;
        title: string;
        authorName: string;
        authorId: number;
        forumName: string;
        forumId: number;
        threadId: number;
        threadTitle: string;
        createdAt: Date;
    } | {
        threadId: null;
        threadTitle: null;
        type: string;
        id: number;
        title: string;
        authorName: string;
        authorId: number;
        forumName: string;
        forumId: number;
        createdAt: Date;
    })[]>;
    getAllUsers(page: number, limit: number, search?: string): Promise<{
        data: {
            id: number;
            name: string;
            email: string;
            role: string;
            authProvider: string;
            avatar: string | null;
            createdAt: Date;
            threadCount: number;
            postCount: number;
        }[];
        total: number;
    }>;
    updateUserRole(id: number, role: 'user' | 'admin'): Promise<{
        id: number;
        name: string;
        email: string;
        passwordHash: string | null;
        googleId: string | null;
        authProvider: string;
        role: string;
        avatar: string | null;
        createdAt: Date;
    } | undefined>;
    deleteUser(id: number): Promise<void>;
    getAllForumsAdmin(page: number, limit: number): Promise<{
        data: {
            id: number;
            name: string;
            description: string | null;
            createdBy: number | null;
            createdAt: Date;
            threadCount: number;
            postCount: number;
            creatorName: string | null;
        }[];
        total: number;
    }>;
    getAllThreadsAdmin(page: number, limit: number, search?: string): Promise<{
        data: {
            id: number;
            title: string;
            isPinned: boolean;
            isLocked: boolean;
            createdAt: Date;
            authorId: number;
            authorName: string;
            forumId: number;
            forumName: string;
            replyCount: number;
        }[];
        total: number;
    }>;
    getAllPostsAdmin(page: number, limit: number): Promise<{
        data: {
            id: number;
            content: string;
            createdAt: Date;
            authorId: number;
            authorName: string;
            threadId: number;
            threadTitle: string;
            forumId: number;
        }[];
        total: number;
    }>;
}
export declare const adminRepository: AdminRepository;
//# sourceMappingURL=admin.repository.d.ts.map