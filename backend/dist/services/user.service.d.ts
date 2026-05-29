import type { UpdateUserDTO } from '../types/index.js';
export declare class UserService {
    getProfile(userId: number): Promise<any>;
    getPublicProfile(userId: number): Promise<{
        id: number;
        name: string;
        avatar: string | null;
        createdAt: Date;
    }>;
    updateProfile(userId: number, data: UpdateUserDTO): Promise<any>;
    private sanitizeUser;
}
export declare const userService: UserService;
//# sourceMappingURL=user.service.d.ts.map