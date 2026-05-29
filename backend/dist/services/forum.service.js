import { forumRepository } from '../repositories/forum.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
export class ForumService {
    async getAllForums() {
        return await forumRepository.findAllWithStats();
    }
    async getForumById(id) {
        const forum = await forumRepository.findById(id);
        if (!forum) {
            throw NotFoundError('Forum not found');
        }
        return forum;
    }
    async createForum(userId, data) {
        return await forumRepository.create({
            name: data.name,
            description: data.description,
            createdBy: userId,
        });
    }
    async updateForum(userId, forumId, data) {
        const forum = await forumRepository.findById(forumId);
        if (!forum) {
            throw NotFoundError('Forum not found');
        }
        // Check ownership or admin
        const user = await userRepository.findById(userId);
        if (forum.createdBy !== userId && user?.role !== 'admin') {
            throw ForbiddenError('You do not have permission to edit this forum');
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.description !== undefined)
            updateData.description = data.description;
        const updated = await forumRepository.update(forumId, updateData);
        return updated;
    }
    async deleteForum(userId, forumId) {
        const forum = await forumRepository.findById(forumId);
        if (!forum) {
            throw NotFoundError('Forum not found');
        }
        const user = await userRepository.findById(userId);
        if (forum.createdBy !== userId && user?.role !== 'admin') {
            throw ForbiddenError('You do not have permission to delete this forum');
        }
        await forumRepository.delete(forumId);
    }
}
export const forumService = new ForumService();
//# sourceMappingURL=forum.service.js.map