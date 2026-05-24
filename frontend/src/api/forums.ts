import type { ApiClient } from './client.js';
import type { Forum, CreateForumDTO } from './types.js';

export class ForumsApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Retrieve all forums.
   */
  public getAllForums(): Promise<Forum[]> {
    return this.client.get<Forum[]>('/forums');
  }

  /**
   * Retrieve a specific forum by its ID.
   */
  public getForumById(id: number): Promise<Forum> {
    return this.client.get<Forum>(`/forums/${id}`);
  }

  /**
   * Create a new forum (Authenticated).
   */
  public createForum(data: CreateForumDTO): Promise<Forum> {
    return this.client.post<Forum>('/forums', data);
  }
}
