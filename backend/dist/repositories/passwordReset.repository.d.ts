export declare class PasswordResetRepository {
    createToken(userId: number): Promise<string>;
    findValidToken(token: string): Promise<{
        id: number;
        userId: number;
        token: string;
        expiresAt: Date;
        usedAt: Date | null;
        createdAt: Date;
    } | undefined>;
    markUsed(id: number): Promise<void>;
}
export declare const passwordResetRepository: PasswordResetRepository;
//# sourceMappingURL=passwordReset.repository.d.ts.map