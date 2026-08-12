import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { notificationsApi } from '../api/index.js';
import { useAuthStore } from '../stores/auth.js';
import type { MarkNotificationsReadDTO } from '../api/types.js';

/** Fallback poll — primary updates come from SSE (useRealtime). */
const POLL_MS = 12_000;

export function useUnreadNotificationCount() {
  const auth = useAuthStore();
  const enabled = computed(() => auth.isAuthenticated);

  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
    // Always accept invalidation from SSE as fresh refetch
    staleTime: 0,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Extra focus refetch for browsers that throttle interval
  const onFocus = () => {
    if (auth.isAuthenticated) void query.refetch();
  };
  onMounted(() => window.addEventListener('focus', onFocus));
  onUnmounted(() => window.removeEventListener('focus', onFocus));

  const count = computed(() => query.data.value?.count ?? 0);
  return { ...query, count };
}

export function useNotificationList(page = ref(1), limit = 20) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => ['notifications', 'list', page.value, limit]),
    queryFn: () => notificationsApi.list(page.value, limit),
    enabled: computed(() => auth.isAuthenticated),
    staleTime: 10_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkNotificationsReadDTO) => notificationsApi.markRead(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Human label for a notification type. */
export function notificationLabel(type: string, actorName?: string | null): string {
  const who = actorName ? `@${actorName}` : 'Someone';
  switch (type) {
    case 'thread_reply':
      return `${who} replied to your thread`;
    case 'post_reply':
      return `${who} replied to your post`;
    case 'mention':
      return `${who} mentioned you`;
    case 'badge_awarded':
      return 'You earned a badge';
    case 'like_thread':
      return `${who} liked your thread`;
    case 'like_post':
      return `${who} liked your post`;
    case 'report_resolved':
      return 'Your report was reviewed';
    default:
      return 'New notification';
  }
}

export function notificationHref(n: {
  type: string;
  threadId: string | null;
  entityType: string | null;
  entityId: string | null;
}): string | null {
  if (n.threadId) {
    if (n.entityType === 'post' && n.entityId) {
      return `/thread/${n.threadId}#post-${n.entityId}`;
    }
    return `/thread/${n.threadId}`;
  }
  if (n.type === 'badge_awarded') return '/profile';
  return null;
}
