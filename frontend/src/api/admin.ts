import type { ApiClient } from './client.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalForums: number;
  totalThreads: number;
  totalPosts: number;
  newUsersWeek: number;
  newThreadsWeek: number;
  newPostsWeek: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  tier: string;
  authProvider: 'local' | 'google';
  avatar: string | null;
  createdAt: string;
  threadCount: number;
  postCount: number;
}

export interface AdminForum {
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  createdAt: string;
  threadCount: number;
  postCount: number;
  creatorName: string | null;
}

export interface AdminThread {
  id: number;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  authorId: number;
  authorName: string;
  forumId: number;
  forumName: string;
  replyCount: number;
}

export interface AdminPost {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  authorName: string;
  threadId: number;
  threadTitle: string;
  forumId: number;
}

export interface ActivityItem {
  type: 'thread' | 'post';
  id: number;
  title: string;
  authorName: string;
  authorId: number;
  forumName: string;
  forumId: number;
  threadId: number | null;
  threadTitle: string | null;
  createdAt: string;
}

export interface PaginatedAdminResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API Class ──────────────────────────────────────────────────────────────

export class AdminApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Stats
  getStats(): Promise<AdminStats> {
    return this.client.get<AdminStats>('/admin/stats');
  }

  getRecentActivity(): Promise<ActivityItem[]> {
    return this.client.get<ActivityItem[]>('/admin/activity');
  }

  // Users
  getUsers(page = 1, limit = 20, search?: string): Promise<PaginatedAdminResult<AdminUser>> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) q.set('search', search);
    return this.client.get<PaginatedAdminResult<AdminUser>>(`/admin/users?${q}`);
  }

  updateUserRole(id: number, role: 'user' | 'admin'): Promise<AdminUser> {
    return this.client.patch<AdminUser>(`/admin/users/${id}/role`, { role });
  }

  updateUserTier(id: number, tier: string): Promise<AdminUser> {
    return this.client.patch<AdminUser>(`/admin/users/${id}/tier`, { tier });
  }

  deleteUser(id: number): Promise<void> {
    return this.client.delete<void>(`/admin/users/${id}`);
  }

  // Forums
  getForums(page = 1, limit = 50): Promise<PaginatedAdminResult<AdminForum>> {
    return this.client.get<PaginatedAdminResult<AdminForum>>(`/admin/forums?page=${page}&limit=${limit}`);
  }

  deleteForum(id: number): Promise<void> {
    return this.client.delete<void>(`/admin/forums/${id}`);
  }

  // Threads
  getThreads(page = 1, limit = 20, search?: string): Promise<PaginatedAdminResult<AdminThread>> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) q.set('search', search);
    return this.client.get<PaginatedAdminResult<AdminThread>>(`/admin/threads?${q}`);
  }

  deleteThread(id: number): Promise<void> {
    return this.client.delete<void>(`/admin/threads/${id}`);
  }

  // Posts
  getPosts(page = 1, limit = 20): Promise<PaginatedAdminResult<AdminPost>> {
    return this.client.get<PaginatedAdminResult<AdminPost>>(`/admin/posts?page=${page}&limit=${limit}`);
  }

  deletePost(id: number): Promise<void> {
    return this.client.delete<void>(`/admin/posts/${id}`);
  }
}
