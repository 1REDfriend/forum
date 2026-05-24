import { ApiClient } from './client.js';
import { AuthApi } from './auth.js';
import { ForumsApi } from './forums.js';
import { ThreadsApi } from './threads.js';
import { PostsApi } from './posts.js';

// Resolve backend API base URL from Vite env variables or fallback to local port 3636
const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3636';

/**
 * Configure and instantiate default ApiClient.
 * Reads the jwt auth token dynamically from localStorage whenever a request is fired.
 */
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

// Instantiate singleton API domain handlers using dependency injection
export const authApi = new AuthApi(apiClient);
export const forumsApi = new ForumsApi(apiClient);
export const threadsApi = new ThreadsApi(apiClient);
export const postsApi = new PostsApi(apiClient);

// Re-export ApiClient definitions for customization if needed
export * from './client.js';
export * from './types.js';
export default {
  client: apiClient,
  auth: authApi,
  forums: forumsApi,
  threads: threadsApi,
  posts: postsApi,
};
export type { AuthResponse } from './types.js';
