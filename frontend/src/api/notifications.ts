import type { ApiClient } from './client.js';
import type {
  MarkNotificationsReadDTO,
  NotificationListResponse,
  UnreadCountResponse,
} from './types.js';

export class NotificationsApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  public list(page = 1, limit = 20): Promise<NotificationListResponse> {
    return this.client.get<NotificationListResponse>(
      `/notifications?page=${page}&limit=${limit}`,
    );
  }

  public unreadCount(): Promise<UnreadCountResponse> {
    return this.client.get<UnreadCountResponse>('/notifications/unread-count');
  }

  public markRead(body: MarkNotificationsReadDTO): Promise<{ marked: number }> {
    return this.client.post<{ marked: number }>('/notifications/read', body);
  }
}
