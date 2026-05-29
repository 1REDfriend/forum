import type { ApiClient } from './client.js';
import type { ThreadDetail, ThreadSimple, CreateThreadDTO, UpdateThreadDTO, PaginatedResponse } from './types.js';

export class ThreadsApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Retrieve all threads.
   */
  public getAllThreads(): Promise<ThreadDetail[]> {
    return this.client.get<ThreadDetail[]>('/threads');
  }

  /**
   * Retrieve threads by forum ID with pagination.
   */
  public getThreadsByForumId(forumId: number, page = 1, limit = 20): Promise<PaginatedResponse<ThreadDetail>> {
    return this.client.get<PaginatedResponse<ThreadDetail>>(`/threads/forum/${forumId}?page=${page}&limit=${limit}`);
  }

  /**
   * Retrieve a specific thread by its ID.
   */
  public getThreadById(id: number): Promise<ThreadDetail> {
    return this.client.get<ThreadDetail>(`/threads/${id}`);
  }

  /**
   * Create a new thread (Authenticated).
   */
  public createThread(data: CreateThreadDTO): Promise<ThreadSimple> {
    return this.client.post<ThreadSimple>('/threads', data);
  }

  /**
   * Update a thread (Authenticated, owner only).
   */
  public updateThread(id: number, data: UpdateThreadDTO): Promise<ThreadSimple> {
    return this.client.put<ThreadSimple>(`/threads/${id}`, data);
  }

  /**
   * Delete a thread (Authenticated, owner/admin only).
   */
  public deleteThread(id: number): Promise<void> {
    return this.client.delete<void>(`/threads/${id}`);
  }

  /**
   * Toggle pin on a thread (Admin only).
   */
  public pinThread(id: number): Promise<{ isPinned: boolean }> {
    return this.client.patch<{ isPinned: boolean }>(`/threads/${id}/pin`);
  }

  /**
   * Toggle lock on a thread (Admin only).
   */
  public lockThread(id: number): Promise<{ isLocked: boolean }> {
    return this.client.patch<{ isLocked: boolean }>(`/threads/${id}/lock`);
  }
}
