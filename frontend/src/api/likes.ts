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

  public toggleThreadLike(threadId: string): Promise<LikeToggleResult> {
    return this.client.post<LikeToggleResult>(`/likes/thread/${threadId}`);
  }

  public togglePostLike(postId: string): Promise<LikeToggleResult> {
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

  /**
   * Upload a content image (for markdown editor paste). Returns the URL.
   */
  public async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const result = await this.client.post<{ url: string }>('/upload/image', formData);
    return result.url;
  }
}
