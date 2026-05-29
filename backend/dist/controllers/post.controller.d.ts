import type { Request, Response, NextFunction } from 'express';
export declare class PostController {
    getPostsByThreadId(req: Request, res: Response, next: NextFunction): Promise<void>;
    createPost(req: Request, res: Response, next: NextFunction): Promise<void>;
    updatePost(req: Request, res: Response, next: NextFunction): Promise<void>;
    deletePost(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const postController: PostController;
//# sourceMappingURL=post.controller.d.ts.map