import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { userRepository } from '../repositories/user.repository.js';
import { passwordResetRepository } from '../repositories/passwordReset.repository.js';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy-client-id');
const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
export class AuthService {
    async register(data) {
        const existingUser = await userRepository.findByEmail(data.email);
        if (existingUser) {
            throw ConflictError('Email already in use');
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);
        const user = await userRepository.create({
            name: data.name,
            email: data.email,
            passwordHash,
            authProvider: 'local',
        });
        const token = this.generateToken(user.id);
        return { user: this.sanitizeUser(user), token };
    }
    async login(data) {
        const user = await userRepository.findByEmail(data.email);
        if (!user || user.authProvider !== 'local' || !user.passwordHash) {
            throw UnauthorizedError('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(data.password, user.passwordHash);
        if (!isMatch) {
            throw UnauthorizedError('Invalid credentials');
        }
        const token = this.generateToken(user.id);
        return { user: this.sanitizeUser(user), token };
    }
    async googleAuth(data) {
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: data.idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        }
        catch (error) {
            throw UnauthorizedError('Invalid Google Token');
        }
        if (!payload || !payload.email) {
            throw UnauthorizedError('Invalid Google Token Payload');
        }
        const email = payload.email;
        const name = payload.name || 'Google User';
        const googleId = payload.sub;
        let user = await userRepository.findByEmail(email);
        if (!user) {
            user = await userRepository.create({
                name,
                email,
                googleId,
                authProvider: 'google',
            });
        }
        else if (!user.googleId && googleId) {
            user = (await userRepository.update(user.id, { googleId }));
        }
        const token = this.generateToken(user.id);
        return { user: this.sanitizeUser(user), token };
    }
    async forgotPassword(data) {
        // Always return a success message to avoid user enumeration attacks
        const user = await userRepository.findByEmail(data.email);
        if (!user || user.authProvider !== 'local') {
            return { message: 'If that email exists in our system, a reset link has been sent.' };
        }
        const token = await passwordResetRepository.createToken(user.id);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
        await sendPasswordResetEmail(user.email, resetUrl);
        return { message: 'If that email exists in our system, a reset link has been sent.' };
    }
    async resetPassword(data) {
        const tokenRow = await passwordResetRepository.findValidToken(data.token);
        if (!tokenRow) {
            throw BadRequestError('Invalid or expired reset token');
        }
        const user = await userRepository.findById(tokenRow.userId);
        if (!user) {
            throw NotFoundError('User not found');
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);
        await userRepository.update(user.id, { passwordHash });
        await passwordResetRepository.markUsed(tokenRow.id);
        return { message: 'Password has been reset successfully. You can now log in.' };
    }
    generateToken(userId) {
        return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
    }
    sanitizeUser(user) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }
}
export const authService = new AuthService();
//# sourceMappingURL=auth.service.js.map