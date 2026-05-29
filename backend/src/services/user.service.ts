import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError } from '../utils/errors.js';
import type { UpdateUserDTO } from '../types/index.js';

export class UserService {
  async getProfile(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw NotFoundError('User not found');
    }
    return this.sanitizeUser(user);
  }

  async getPublicProfile(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw NotFoundError('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: number, data: UpdateUserDTO) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw NotFoundError('User not found');
    }

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    const updated = await userRepository.update(userId, updateData);
    return this.sanitizeUser(updated!);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export const userService = new UserService();
