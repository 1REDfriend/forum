import type { Request, Response, NextFunction } from 'express';
export declare class ThreadController {
    getAllThreads(req: Request, res: Response, next: NextFunction): Promise<void>;
    getThreadById(req: Request, res: Response, next: NextFunction): Promise<void>;
    getThreadsByForumId(req: Request, res: Response, next: NextFunction): Promise<void>;
    createThread(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateThread(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteThread(req: Request, res: Response, next: NextFunction): Promise<void>;
    pinThread(req: Request, res: Response, next: NextFunction): Promise<void>;
    lockThread(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const threadController: ThreadController;
//# sourceMappingURL=thread.controller.d.ts.map