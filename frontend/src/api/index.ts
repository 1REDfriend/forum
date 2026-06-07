import { ApiClient } from './client.js';
import { AuthApi } from './auth.js';
import { ForumsApi } from './forums.js';
import { ThreadsApi } from './threads.js';
import { PostsApi } from './posts.js';
import { UsersApi, SearchApi } from './users.js';
import { LikesApi, UploadApi } from './likes.js';
import { AdminApi } from './admin.js';
import { ReportsApi } from './reports.js';

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
  getRefreshToken: () => {
    try {
      return localStorage.getItem('refreshToken');
    } catch {
      return null;
    }
  },
  // Persist a rotated access + refresh pair after a successful silent refresh.
  setTokens: (token: string, refreshToken: string) => {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
    } catch {
      /* ignore */
    }
  },
  // Called when refresh fails / session is truly dead: clear it and bounce to login.
  onUnauthorized: () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  },
  // A still-valid token belonging to a now-banned account: clear session, tell the
  // user why, and bounce to login. Reason comes from the server's 403 body.
  onAccountBanned: (reason: string) => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      window.alert(`บัญชีของคุณถูกระงับการใช้งาน\nเหตุผล: ${reason}\n\nคุณได้ออกจากระบบแล้ว`);
      if (window.location.pathname !== '/login') window.location.assign('/login');
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
export const reportsApi = new ReportsApi(apiClient);

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
