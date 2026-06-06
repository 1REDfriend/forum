import type { ApiClient } from './client.js';
import type { Forum, ForumWithStats, CreateForumDTO, UpdateForumDTO } from './types.js';

export class ForumsApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Retrieve all forums with stats (thread count, post count).
   */
  public getAllForums(): Promise<ForumWithStats[]> {
    return this.client.get<ForumWithStats[]>('/forums');
  }

  /**
   * Retrieve a specific forum by its ID.
   */
  public getForumById(id: string): Promise<Forum> {
    return this.client.get<Forum>(`/forums/${id}`);
  }

  /**
   * Create a new forum (Authenticated).
   */
  public createForum(data: CreateForumDTO): Promise<Forum> {
    return this.client.post<Forum>('/forums', data);
  }

  /**
   * Update a forum (Authenticated, owner/admin only).
   */
  public updateForum(id: string, data: UpdateForumDTO): Promise<Forum> {
    return this.client.put<Forum>(`/forums/${id}`, data);
  }

  /**
   * Delete a forum (Authenticated, owner/admin only).
   */
  public deleteForum(id: string): Promise<void> {
    return this.client.delete<void>(`/forums/${id}`);
  }
}
