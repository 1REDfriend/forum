import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../types/index.js';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Optional authentication middleware — does not block requests without token.
 * Populates req.user if a valid token is present, otherwise leaves it undefined.
 */
export declare const optionalAuthenticate: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map