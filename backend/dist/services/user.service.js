import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError } from '../utils/errors.js';
export class UserService {
    async getProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw NotFoundError('User not found');
        }
        return this.sanitizeUser(user);
    }
    async getPublicProfile(userId) {
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
    async updateProfile(userId, data) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw NotFoundError('User not found');
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.avatar !== undefined)
            updateData.avatar = data.avatar;
        const updated = await userRepository.update(userId, updateData);
        return this.sanitizeUser(updated);
    }
    sanitizeUser(user) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }
}
export const userService = new UserService();
//# sourceMappingURL=user.service.js.map