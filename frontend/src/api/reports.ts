import type { ApiClient } from './client.js';

export class ReportsApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** Report a thread/post/user with a reason. */
  public create(data: {
    targetType: 'thread' | 'post' | 'user';
    targetId: string;
    reason: string;
  }): Promise<{ message: string }> {
    return this.client.post<{ message: string }>('/reports', data);
  }
}
