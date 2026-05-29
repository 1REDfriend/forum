import type { Request, Response, NextFunction } from 'express';
export declare class AdminController {
    getStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void>;
    getUsers(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteUser(req: Request, res: Response, next: NextFunction): Promise<void>;
    getForums(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteForum(req: Request, res: Response, next: NextFunction): Promise<void>;
    getThreads(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteThread(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPosts(req: Request, res: Response, next: NextFunction): Promise<void>;
    deletePost(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const adminController: AdminController;
//# sourceMappingURL=admin.controller.d.ts.map