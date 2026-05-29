export declare class LikeRepository {
    findThreadLike(userId: number, threadId: number): Promise<{
        id: number;
        userId: number;
        threadId: number | null;
        postId: number | null;
        createdAt: Date;
    } | undefined>;
    addThreadLike(userId: number, threadId: number): Promise<void>;
    removeThreadLike(userId: number, threadId: number): Promise<void>;
    countThreadLikes(threadId: number): Promise<number>;
    getThreadLikesForUser(userId: number, threadIds: number[]): Promise<Set<number>>;
    getThreadLikeCounts(threadIds: number[]): Promise<Map<number, number>>;
    findPostLike(userId: number, postId: number): Promise<{
        id: number;
        userId: number;
        threadId: number | null;
        postId: number | null;
        createdAt: Date;
    } | undefined>;
    addPostLike(userId: number, postId: number): Promise<void>;
    removePostLike(userId: number, postId: number): Promise<void>;
    countPostLikes(postId: number): Promise<number>;
    getPostLikeCounts(postIds: number[]): Promise<Map<number, number>>;
    getPostLikesForUser(userId: number, postIds: number[]): Promise<Set<number>>;
}
export declare const likeRepository: LikeRepository;
//# sourceMappingURL=like.repository.d.ts.map