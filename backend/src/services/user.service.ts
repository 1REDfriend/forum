import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { isSafeMediaUrl } from '../domain/media-url.js';
import type { UpdateUserDTO } from '../types/index.js';
import { tierService } from './tier.service.js';
import { badgeService } from './badge.service.js';

export class UserService {
  /** Recompute score/tier (monotonic), sync badges, and assemble the profile payload. */
  private async withProgression(base: Record<string, any>, userId: string, storedTier: string) {
    const t = await tierService.sync(userId, storedTier);
    const badges = await badgeService.syncAndGet(userId, {
      posts: t.stats.threads + t.stats.posts,
      likesReceived: t.stats.likesReceived,
      accountAgeDays: t.stats.accountAgeDays,
      longestStreak: t.stats.longestStreak,
    });
    return {
      ...base,
      tier: t.tier,
      score: t.score,
      stats: t.stats,
      currentTier: t.currentTier,
      nextTier: t.nextTier,
      progress: t.progress,
      pointsToNext: t.pointsToNext,
      badges,
    };
  }

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw NotFoundError('User not found');
    }
    return this.withProgression(this.sanitizeUser(user), user.id, user.tier);
  }

  async getPublicProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw NotFoundError('User not found');
    }
    const base = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      banner: user.banner,
      bio: user.bio,
      role: user.role,
      tier: user.tier,
      createdAt: user.createdAt,
    };
    return this.withProgression(base, user.id, user.tier);
  }

  async updateProfile(userId: string, data: UpdateUserDTO) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw NotFoundError('User not found');
    }

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) {
      if (data.avatar && !isSafeMediaUrl(data.avatar)) throw BadRequestError('Invalid avatar URL');
      updateData.avatar = data.avatar;
    }
    if (data.banner !== undefined) {
      if (data.banner && !isSafeMediaUrl(data.banner)) throw BadRequestError('Invalid banner URL');
      updateData.banner = data.banner;
    }
    if (data.bio !== undefined) updateData.bio = data.bio;
    const updated = await userRepository.update(userId, updateData);
    return this.sanitizeUser(updated!);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export const userService = new UserService();
