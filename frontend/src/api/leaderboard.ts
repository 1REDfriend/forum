import type { ApiClient } from './client.js';
import type { LeaderboardResponse } from './types.js';

export class LeaderboardApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  public get(period: 'week' | 'all' = 'week', limit = 20): Promise<LeaderboardResponse> {
    return this.client.get<LeaderboardResponse>(
      `/leaderboard?period=${period}&limit=${limit}`,
    );
  }
}
