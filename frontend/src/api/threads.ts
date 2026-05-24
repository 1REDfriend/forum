import type { ApiClient } from './client.js';
import type { ThreadDetail, ThreadSimple, CreateThreadDTO } from './types.js';

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
}
