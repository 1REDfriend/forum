import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { userRepository } from '../repositories/user.repository.js';
import { passwordResetRepository } from '../repositories/passwordReset.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { streakService } from './streak.service.js';
import type { RegisterDTO, LoginDTO, GoogleAuthDTO, ForgotPasswordDTO, ResetPasswordDTO } from '../types/index.js';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy-client-id');
const jwtSecret =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('JWT_SECRET environment variable must be set in production');
      })()
    : 'fallback-secret-for-dev-only');

// Short-lived access token; long-lived rotating refresh token (see refreshToken.repository).
const ACCESS_TOKEN_TTL = '1h';

export class AuthService {
  async register(data: RegisterDTO) {
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

    return this.buildSession(user);
  }

  async login(data: LoginDTO) {
    const user = await userRepository.findByEmail(data.email);
    if (!user || user.authProvider !== 'local' || !user.passwordHash) {
      throw UnauthorizedError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw UnauthorizedError('Invalid credentials');
    }

    return this.buildSession(user);
  }

  async googleAuth(data: GoogleAuthDTO) {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: data.idToken,
        audience: process.env.GOOGLE_CLIENT_ID as string,
      });
      payload = ticket.getPayload();
    } catch (error) {
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
    } else if (!user.googleId && googleId) {
      user = (await userRepository.update(user.id, { googleId }))!;
    }

    return this.buildSession(user);
  }

  /**
   * Exchange a refresh token for a fresh access + refresh pair (rotation:
   * the presented refresh token is revoked so it can't be reused).
   */
  async refresh(refreshToken: string) {
    const row = await refreshTokenRepository.findValid(refreshToken);
    if (!row) {
      throw UnauthorizedError('Invalid or expired refresh token');
    }
    const user = await userRepository.findById(row.userId);
    if (!user) {
      throw UnauthorizedError('Invalid refresh token');
    }
    await refreshTokenRepository.revokeById(row.id); // rotate
    return this.buildSession(user);
  }

  /** Revoke a refresh token (logout). Always succeeds, even if the token is unknown. */
  async logout(refreshToken?: string) {
    if (refreshToken) {
      await refreshTokenRepository.revokeRaw(refreshToken);
    }
    return { message: 'Logged out' };
  }

  async forgotPassword(data: ForgotPasswordDTO) {
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

  async resetPassword(data: ResetPasswordDTO) {
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
    await refreshTokenRepository.revokeAllForUser(user.id);
    await passwordResetRepository.markUsed(tokenRow.id);

    return { message: 'Password has been reset successfully. You can now log in.' };
  }

  /** Build the auth response: sanitized user + short access token + new refresh token. */
  private async buildSession(user: { id: number }) {
    await streakService.touch(user.id); // bump login streak (once/day)
    const token = this.generateAccessToken(user.id);
    const refreshToken = await refreshTokenRepository.issue(user.id);
    return { user: this.sanitizeUser(user), token, refreshToken };
  }

  private generateAccessToken(userId: number): string {
    return jwt.sign({ userId }, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export const authService = new AuthService();
