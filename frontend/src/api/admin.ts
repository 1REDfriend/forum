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
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  tier: string;
  authProvider: 'local' | 'google';
  avatar: string | null;
  createdAt: string;
  threadCount: number;
  postCount: number;
  badgeKeys: string[];
  isBanned: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
}

export interface BadgeCatalogItem {
  key: string;
  label: string;
  desc: string;
  icon: string;
}

export interface AdminForum {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  threadCount: number;
  postCount: number;
  creatorName: string | null;
}

export interface AdminThread {
  id: string;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  authorId: string;
  authorName: string;
  forumId: string;
  forumName: string;
  replyCount: number;
}

export interface AdminPost {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  threadId: string;
  threadTitle: string;
  forumId: string;
}

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'thread' | 'post' | 'user';
  targetId: string;
  reason: string;
  status: 'open' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface ActivityItem {
  type: 'thread' | 'post';
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  forumName: string;
  forumId: string;
  threadId: string | null;
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

  updateUserRole(id: string, role: 'user' | 'admin'): Promise<AdminUser> {
    return this.client.patch<AdminUser>(`/admin/users/${id}/role`, { role });
  }

  updateUserTier(id: string, tier: string): Promise<AdminUser> {
    return this.client.patch<AdminUser>(`/admin/users/${id}/tier`, { tier });
  }

  deleteUser(id: string): Promise<void> {
    return this.client.delete<void>(`/admin/users/${id}`);
  }

  banUser(userId: string, reason: string): Promise<AdminUser> {
    return this.client.patch<AdminUser>(`/admin/users/${userId}/ban`, { reason });
  }

  unbanUser(userId: string): Promise<AdminUser> {
    return this.client.patch<AdminUser>(`/admin/users/${userId}/unban`, {});
  }

  // Forums
  getForums(page = 1, limit = 50): Promise<PaginatedAdminResult<AdminForum>> {
    return this.client.get<PaginatedAdminResult<AdminForum>>(`/admin/forums?page=${page}&limit=${limit}`);
  }

  updateForum(id: string, data: { name?: string; description?: string }): Promise<AdminForum> {
    return this.client.put<AdminForum>(`/forums/${id}`, data);
  }

  deleteForum(id: string): Promise<void> {
    return this.client.delete<void>(`/admin/forums/${id}`);
  }

  // Threads
  getThreads(page = 1, limit = 20, search?: string): Promise<PaginatedAdminResult<AdminThread>> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) q.set('search', search);
    return this.client.get<PaginatedAdminResult<AdminThread>>(`/admin/threads?${q}`);
  }

  deleteThread(id: string): Promise<void> {
    return this.client.delete<void>(`/admin/threads/${id}`);
  }

  // Posts
  getPosts(page = 1, limit = 20): Promise<PaginatedAdminResult<AdminPost>> {
    return this.client.get<PaginatedAdminResult<AdminPost>>(`/admin/posts?page=${page}&limit=${limit}`);
  }

  deletePost(id: string): Promise<void> {
    return this.client.delete<void>(`/admin/posts/${id}`);
  }

  // Reports
  getReports(page = 1, limit = 20, status?: string): Promise<PaginatedAdminResult<AdminReport>> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) q.set('status', status);
    return this.client.get<PaginatedAdminResult<AdminReport>>(`/admin/reports?${q}`);
  }

  resolveReport(id: string, status: 'open' | 'reviewed' | 'dismissed'): Promise<AdminReport> {
    return this.client.patch<AdminReport>(`/admin/reports/${id}`, { status });
  }

  // Badges
  getBadgeCatalog(): Promise<BadgeCatalogItem[]> {
    return this.client.get<BadgeCatalogItem[]>('/admin/badges');
  }

  grantBadge(userId: string, badgeKey: string): Promise<{ message: string }> {
    return this.client.post<{ message: string }>(`/admin/users/${userId}/badges`, { badgeKey });
  }

  revokeBadge(userId: string, badgeKey: string): Promise<void> {
    return this.client.delete<void>(`/admin/users/${userId}/badges/${badgeKey}`);
  }
}
