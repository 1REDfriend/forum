import { forumRepository } from '../repositories/forum.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import type { CreateForumDTO, UpdateForumDTO } from '../types/index.js';
import { canModifyForum } from '../domain/forum-policy.js';

export class ForumService {
  async getAllForums() {
    return await forumRepository.findAllWithStats();
  }

  async getForumById(id: string) {
    const forum = await forumRepository.findById(id);
    if (!forum) {
      throw NotFoundError('Forum not found');
    }
    return forum;
  }

  async createForum(userId: string, data: CreateForumDTO) {
    return await forumRepository.create({
      name: data.name,
      description: data.description,
      createdBy: userId,
    });
  }

  async updateForum(userId: string, forumId: string, data: UpdateForumDTO) {
    const forum = await forumRepository.findById(forumId);
    if (!forum) {
      throw NotFoundError('Forum not found');
    }

    // Owner, or a forum-manager role (admin/manager)
    const user = await userRepository.findById(userId);
    if (!canModifyForum(userId, user?.role, forum.createdBy)) {
      throw ForbiddenError('You do not have permission to edit this forum');
    }

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    const updated = await forumRepository.update(forumId, updateData);
    return updated;
  }

  async deleteForum(userId: string, forumId: string) {
    const forum = await forumRepository.findById(forumId);
    if (!forum) {
      throw NotFoundError('Forum not found');
    }

    const user = await userRepository.findById(userId);
    if (!canModifyForum(userId, user?.role, forum.createdBy)) {
      throw ForbiddenError('You do not have permission to delete this forum');
    }

    await forumRepository.delete(forumId);
  }
}

export const forumService = new ForumService();
