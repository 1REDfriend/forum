import type { ApiClient } from './client.js';
import type { User, UpdateUserDTO, SearchResponse, UserSuggestItem } from './types.js';

export class UsersApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Get current authenticated user's profile.
   */
  public getMe(): Promise<User> {
    return this.client.get<User>('/users/me');
  }

  /**
   * Update current user's profile.
   */
  public updateMe(data: UpdateUserDTO): Promise<User> {
    return this.client.put<User>('/users/me', data);
  }

  /**
   * Get a public user profile by ID.
   */
  public getUserById(id: string): Promise<User> {
    return this.client.get<User>(`/users/${id}`);
  }

  /** Typeahead for @mentions (auth required). */
  public suggest(q: string, limit = 8): Promise<{ users: UserSuggestItem[] }> {
    return this.client.get<{ users: UserSuggestItem[] }>(
      `/users/suggest?q=${encodeURIComponent(q)}&limit=${limit}`,
    );
  }
}

export class SearchApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Search forums and threads.
   */
  public search(query: string): Promise<SearchResponse> {
    return this.client.get<SearchResponse>(`/search?q=${encodeURIComponent(query)}`);
  }
}
