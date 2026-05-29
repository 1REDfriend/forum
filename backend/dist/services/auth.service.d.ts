import type { RegisterDTO, LoginDTO, GoogleAuthDTO, ForgotPasswordDTO, ResetPasswordDTO } from '../types/index.js';
export declare class AuthService {
    register(data: RegisterDTO): Promise<{
        user: any;
        token: string;
    }>;
    login(data: LoginDTO): Promise<{
        user: any;
        token: string;
    }>;
    googleAuth(data: GoogleAuthDTO): Promise<{
        user: any;
        token: string;
    }>;
    forgotPassword(data: ForgotPasswordDTO): Promise<{
        message: string;
    }>;
    resetPassword(data: ResetPasswordDTO): Promise<{
        message: string;
    }>;
    private generateToken;
    private sanitizeUser;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map