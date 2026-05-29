import type { Request, Response, NextFunction } from 'express';
export declare class LikeController {
    toggleThreadLike(req: Request, res: Response, next: NextFunction): Promise<void>;
    togglePostLike(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const likeController: LikeController;
//# sourceMappingURL=like.controller.d.ts.map