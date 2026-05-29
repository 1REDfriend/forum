import type { Request, Response, NextFunction } from 'express';
export declare class ForumController {
    getAllForums(req: Request, res: Response, next: NextFunction): Promise<void>;
    getForumById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createForum(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateForum(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteForum(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const forumController: ForumController;
//# sourceMappingURL=forum.controller.d.ts.map