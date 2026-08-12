import type { ApiClient } from './client.js';
import type { ActivityFeed, PublicStats } from './types.js';

export class ActivityApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  public getRecent(limit = 20): Promise<ActivityFeed> {
    return this.client.get<ActivityFeed>(`/activity/recent?limit=${limit}`);
  }

  public getPublicStats(): Promise<PublicStats> {
    return this.client.get<PublicStats>('/stats/public');
  }
}
