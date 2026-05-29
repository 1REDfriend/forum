import jwt from 'jsonwebtoken';
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
        return;
    }
    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
        return;
    }
};
/**
 * Optional authentication middleware — does not block requests without token.
 * Populates req.user if a valid token is present, otherwise leaves it undefined.
 */
export const optionalAuthenticate = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
        try {
            const decoded = jwt.verify(token, jwtSecret);
            req.user = decoded;
        }
        catch {
            // Invalid token — just ignore and continue as unauthenticated
        }
    }
    next();
};
//# sourceMappingURL=auth.middleware.js.map