import type { Request, Response, NextFunction } from 'express';
/**
 * Middleware: requires the authenticated user to have role = 'admin'.
 * Must be used AFTER the `authenticate` middleware.
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=admin.middleware.d.ts.map