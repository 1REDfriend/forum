import { threadRepository } from '../repositories/thread.repository.js';
import type { CreateThreadDTO } from '../types/index.js';

export class ThreadService {
  async getAllThreads() {
    return await threadRepository.findAll();
  }

  async getThreadById(id: number) {
    const thread = await threadRepository.findById(id);
    if (!thread) {
      throw new Error('Thread not found');
    }
    return thread;
  }

  async createThread(userId: number, data: CreateThreadDTO) {
    return await threadRepository.create({
      title: data.title,
      content: data.content,
      forumId: data.forumId,
      authorId: userId,
    });
  }
}

export const threadService = new ThreadService();
