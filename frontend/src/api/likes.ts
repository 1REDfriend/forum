import type { ApiClient } from './client.js';

export interface LikeToggleResult {
  liked: boolean;
  likeCount: number;
}

export class LikesApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  public toggleThreadLike(threadId: number): Promise<LikeToggleResult> {
    return this.client.post<LikeToggleResult>(`/likes/thread/${threadId}`);
  }

  public togglePostLike(postId: number): Promise<LikeToggleResult> {
    return this.client.post<LikeToggleResult>(`/likes/post/${postId}`);
  }
}

export class UploadApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Upload an avatar image file. Returns the URL of the uploaded image.
   */
  public async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('avatar', file);
    const result = await this.client.post<{ url: string }>('/upload/avatar', formData);
    return result.url;
  }
}
