import { forumRepository } from '../repositories/forum.repository.js';
import type { CreateForumDTO } from '../types/index.js';

export class ForumService {
  async getAllForums() {
    return await forumRepository.findAll();
  }

  async getForumById(id: number) {
    const forum = await forumRepository.findById(id);
    if (!forum) {
      throw new Error('Forum not found');
    }
    return forum;
  }

  async createForum(data: CreateForumDTO) {
    return await forumRepository.create({
      name: data.name,
      description: data.description,
    });
  }
}

export const forumService = new ForumService();
