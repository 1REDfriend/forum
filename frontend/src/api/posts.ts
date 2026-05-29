import type { ApiClient } from './client.js';
import type { PostDetail, PostSimple, CreatePostDTO, UpdatePostDTO, PaginatedResponse } from './types.js';

export class PostsApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Retrieve all posts belonging to a specific thread ID with pagination.
   */
  public getPostsByThreadId(threadId: number, page = 1, limit = 20): Promise<PaginatedResponse<PostDetail>> {
    return this.client.get<PaginatedResponse<PostDetail>>(`/posts/thread/${threadId}?page=${page}&limit=${limit}`);
  }

  /**
   * Create a new post in a thread (Authenticated).
   */
  public createPost(data: CreatePostDTO): Promise<PostSimple> {
    return this.client.post<PostSimple>('/posts', data);
  }

  /**
   * Update a post (Authenticated, owner only).
   */
  public updatePost(id: number, data: UpdatePostDTO): Promise<PostSimple> {
    return this.client.put<PostSimple>(`/posts/${id}`, data);
  }

  /**
   * Delete a post (Authenticated, owner/admin only).
   */
  public deletePost(id: number): Promise<void> {
    return this.client.delete<void>(`/posts/${id}`);
  }
}
