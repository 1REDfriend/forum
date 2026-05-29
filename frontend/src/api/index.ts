import { ApiClient } from './client.js';
import { AuthApi } from './auth.js';
import { ForumsApi } from './forums.js';
import { ThreadsApi } from './threads.js';
import { PostsApi } from './posts.js';
import { UsersApi, SearchApi } from './users.js';
import { LikesApi, UploadApi } from './likes.js';
import { AdminApi } from './admin.js';

const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3636';

export const apiClient = new ApiClient({
  baseUrl: BASE_URL,
  getToken: () => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  },
});

export const authApi = new AuthApi(apiClient);
export const forumsApi = new ForumsApi(apiClient);
export const threadsApi = new ThreadsApi(apiClient);
export const postsApi = new PostsApi(apiClient);
export const usersApi = new UsersApi(apiClient);
export const searchApi = new SearchApi(apiClient);
export const likesApi = new LikesApi(apiClient);
export const uploadApi = new UploadApi(apiClient);
export const adminApi = new AdminApi(apiClient);

export * from './client.js';
export * from './types.js';
export default {
  client: apiClient,
  auth: authApi,
  forums: forumsApi,
  threads: threadsApi,
  posts: postsApi,
  users: usersApi,
  search: searchApi,
  likes: likesApi,
  upload: uploadApi,
};
export type { AuthResponse } from './types.js';
