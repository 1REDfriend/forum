import { postRepository } from '../repositories/post.repository.js';
import type { CreatePostDTO } from '../types/index.js';

export class PostService {
  async getPostsByThreadId(threadId: number) {
    return await postRepository.findByThreadId(threadId);
  }

  async createPost(userId: number, data: CreatePostDTO) {
    return await postRepository.create({
      content: data.content,
      threadId: data.threadId,
      authorId: userId,
    });
  }
}

export const postService = new PostService();
