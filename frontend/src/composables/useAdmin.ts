import { computed, unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { adminApi } from '../api/index.js';

// ─── Queries ────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });
}

export function useAdminActivity() {
  return useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: () => adminApi.getRecentActivity(),
  });
}

export function useAdminUsers(
  page: MaybeRef<number>,
  search: MaybeRef<string>,
  limit: MaybeRef<number> = 15,
  enabled: MaybeRef<boolean> = true,
) {
  return useQuery({
    queryKey: ['admin', 'users', page, search, limit],
    queryFn: () => adminApi.getUsers(unref(page), unref(limit), unref(search) || undefined),
    enabled: computed(() => unref(enabled)),
  });
}

export function useAdminForums(
  page: MaybeRef<number>,
  limit: MaybeRef<number> = 20,
  enabled: MaybeRef<boolean> = true,
) {
  return useQuery({
    queryKey: ['admin', 'forums', page, limit],
    queryFn: () => adminApi.getForums(unref(page), unref(limit)),
    enabled: computed(() => unref(enabled)),
  });
}

export function useAdminThreads(
  page: MaybeRef<number>,
  search: MaybeRef<string>,
  limit: MaybeRef<number> = 15,
  enabled: MaybeRef<boolean> = true,
) {
  return useQuery({
    queryKey: ['admin', 'threads', page, search, limit],
    queryFn: () => adminApi.getThreads(unref(page), unref(limit), unref(search) || undefined),
    enabled: computed(() => unref(enabled)),
  });
}

export function useAdminPosts(
  page: MaybeRef<number>,
  limit: MaybeRef<number> = 15,
  enabled: MaybeRef<boolean> = true,
) {
  return useQuery({
    queryKey: ['admin', 'posts', page, limit],
    queryFn: () => adminApi.getPosts(unref(page), unref(limit)),
    enabled: computed(() => unref(enabled)),
  });
}

export function useAdminReports(
  page: MaybeRef<number>,
  status: MaybeRef<string>,
  limit: MaybeRef<number> = 15,
  enabled: MaybeRef<boolean> = true,
) {
  return useQuery({
    queryKey: ['admin', 'reports', page, status, limit],
    queryFn: () => adminApi.getReports(unref(page), unref(limit), unref(status) || undefined),
    enabled: computed(() => unref(enabled)),
  });
}

export function useAdminBadgeCatalog(enabled: MaybeRef<boolean> = true) {
  return useQuery({
    queryKey: ['admin', 'badges'],
    queryFn: () => adminApi.getBadgeCatalog(),
    enabled: computed(() => unref(enabled)),
  });
}

export function useBadgeCatalog() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: () => adminApi.getPublicBadgeCatalog(),
  });
}

// ─── User mutations ─────────────────────────────────────────────────────────

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
  });
}

export function useUpdateUserTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: string }) => adminApi.updateUserTier(id, tier),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.banUser(id, reason),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.unbanUser(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
  });
}

// ─── Forum mutations ────────────────────────────────────────────────────────

export function useUpdateAdminForum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      adminApi.updateForum(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'forums'] });
      // Same forum resource cached by the public-facing useForums/useForum composables.
      qc.invalidateQueries({ queryKey: ['forums'] });
      qc.invalidateQueries({ queryKey: ['forum', id] });
    },
  });
}

export function useDeleteAdminForum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteForum(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['admin', 'forums'] });
      qc.invalidateQueries({ queryKey: ['forums'] });
      qc.invalidateQueries({ queryKey: ['forum', id] });
    },
  });
}

// ─── Thread mutations ───────────────────────────────────────────────────────

export function useDeleteAdminThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteThread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'threads'] });
      qc.invalidateQueries({ queryKey: ['threads'] });
      // thread lists also live under forum keys
      qc.invalidateQueries({ queryKey: ['forum'] });
    },
  });
}

// ─── Post mutations ─────────────────────────────────────────────────────────

export function useDeleteAdminPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deletePost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      // post lists live under thread keys
      qc.invalidateQueries({ queryKey: ['thread'] });
    },
  });
}

// ─── Report mutations ───────────────────────────────────────────────────────

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'reviewed' | 'dismissed' }) =>
      adminApi.resolveReport(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });
}

// ─── Badge mutations ────────────────────────────────────────────────────────

export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; label: string; description: string; icon: string }) =>
      adminApi.createBadge(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
  });
}

export function useUpdateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      data,
    }: {
      key: string;
      data: { label?: string; description?: string; icon?: string };
    }) => adminApi.updateBadge(key, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
  });
}

export function useDeleteBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => adminApi.deleteBadge(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
  });
}

export function useGrantBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, badgeKey }: { userId: string; badgeKey: string }) =>
      adminApi.grantBadge(userId, badgeKey),
    onSuccess: (_res, { userId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}

export function useRevokeBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, badgeKey }: { userId: string; badgeKey: string }) =>
      adminApi.revokeBadge(userId, badgeKey),
    onSuccess: (_res, { userId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}
