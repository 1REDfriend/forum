import type { ApiClient } from './client.js';
import type { PostDetail, PostSimple, CreatePostDTO } from './types.js';

export class PostsApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Retrieve all posts belonging to a specific thread ID.
   */
  public getPostsByThreadId(threadId: number): Promise<PostDetail[]> {
    return this.client.get<PostDetail[]>(`/posts/thread/${threadId}`);
  }

  /**
   * Create a new post in a thread (Authenticated).
   */
  public createPost(data: CreatePostDTO): Promise<PostSimple> {
    return this.client.post<PostSimple>('/posts', data);
  }
}
