export declare class AppError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string);
}
export declare const NotFoundError: (message?: string) => AppError;
export declare const ForbiddenError: (message?: string) => AppError;
export declare const BadRequestError: (message?: string) => AppError;
export declare const UnauthorizedError: (message?: string) => AppError;
export declare const ConflictError: (message?: string) => AppError;
//# sourceMappingURL=errors.d.ts.map