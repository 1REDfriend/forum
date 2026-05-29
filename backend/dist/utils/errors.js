export class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
    }
}
export const NotFoundError = (message = 'Resource not found') => new AppError(404, message);
export const ForbiddenError = (message = 'Forbidden') => new AppError(403, message);
export const BadRequestError = (message = 'Bad request') => new AppError(400, message);
export const UnauthorizedError = (message = 'Unauthorized') => new AppError(401, message);
export const ConflictError = (message = 'Conflict') => new AppError(409, message);
//# sourceMappingURL=errors.js.map