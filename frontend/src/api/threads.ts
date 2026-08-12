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
  public getThreadsByForumId(
    forumId: string,
    page = 1,
    limit = 20,
    opts: { sort?: string; filter?: string } = {},
  ): Promise<PaginatedResponse<ThreadDetail>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.filter) params.set('filter', opts.filter);
    return this.client.get<PaginatedResponse<ThreadDetail>>(
      `/threads/forum/${forumId}?${params.toString()}`,
    );
  }

  /**
   * Retrieve a specific thread by its ID.
   */
  public getThreadById(id: string): Promise<ThreadDetail> {
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
  public updateThread(id: string, data: UpdateThreadDTO): Promise<ThreadSimple> {
    return this.client.put<ThreadSimple>(`/threads/${id}`, data);
  }

  /**
   * Delete a thread (Authenticated, owner/admin only).
   */
  public deleteThread(id: string): Promise<void> {
    return this.client.delete<void>(`/threads/${id}`);
  }

  /**
   * Toggle pin on a thread (Admin only).
   */
  public pinThread(id: string): Promise<{ isPinned: boolean }> {
    return this.client.patch<{ isPinned: boolean }>(`/threads/${id}/pin`);
  }

  /**
   * Toggle lock on a thread (Admin only).
   */
  public lockThread(id: string): Promise<{ isLocked: boolean }> {
    return this.client.patch<{ isLocked: boolean }>(`/threads/${id}/lock`);
  }

  /**
   * Mark a thread as read for the current user (Authenticated).
   */
  public markRead(id: string, at?: string): Promise<{ ok: true }> {
    return this.client.post<{ ok: true }>(`/threads/${id}/read`, at ? { at } : {});
  }
}
