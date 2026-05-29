export declare class LikeService {
    toggleThreadLike(userId: number, threadId: number): Promise<{
        liked: boolean;
        likeCount: number;
    }>;
    togglePostLike(userId: number, postId: number): Promise<{
        liked: boolean;
        likeCount: number;
    }>;
    getThreadLikeStatus(userId: number | null, threadId: number): Promise<{
        likeCount: number;
        isLikedByMe: boolean;
    }>;
}
export declare const likeService: LikeService;
//# sourceMappingURL=like.service.d.ts.map