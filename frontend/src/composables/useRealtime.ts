import { watch, onUnmounted } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '../stores/auth.js';

const API_BASE = ((import.meta.env.VITE_API_URL as string) || 'http://localhost:3636').replace(
  /\/$/,
  '',
);

/**
 * Keep a single EventSource for the app session; reconnect when token/auth changes.
 * On `notification` / `dm` events, refresh badge counts immediately.
 */
export function useRealtime() {
  const auth = useAuthStore();
  const qc = useQueryClient();
  let es: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = 1000;

  const disconnect = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (es) {
      es.close();
      es = null;
    }
  };

  const connect = () => {
    disconnect();
    if (!auth.isAuthenticated) return;
    let token: string | null = null;
    try {
      token = localStorage.getItem('token');
    } catch {
      token = null;
    }
    if (!token) return;

    const url = `${API_BASE}/sse/events?token=${encodeURIComponent(token)}`;
    try {
      es = new EventSource(url);
    } catch {
      scheduleRetry();
      return;
    }

    es.onopen = () => {
      retryMs = 1000;
    };

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string; payload?: unknown };
        if (!data?.type || data.type === 'ping') return;

        if (data.type === 'notification') {
          // Bump unread badge immediately (optimistic), then confirm with server
          qc.setQueryData<{ count: number }>(['notifications', 'unread-count'], (old) => ({
            count: (old?.count ?? 0) + 1,
          }));
          void qc.invalidateQueries({ queryKey: ['notifications'] });
        }
        if (data.type === 'dm') {
          void qc.invalidateQueries({ queryKey: ['dm'] });
        }
        if (data.type === 'thread_post') {
          void qc.invalidateQueries({ queryKey: ['thread'] });
          void qc.invalidateQueries({ queryKey: ['activity'] });
        }
      } catch {
        /* ignore malformed */
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects, but after auth death close & manual retry
      if (es?.readyState === EventSource.CLOSED) {
        disconnect();
        scheduleRetry();
      }
    };
  };

  const scheduleRetry = () => {
    if (retryTimer || !auth.isAuthenticated) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      retryMs = Math.min(retryMs * 1.5, 15000);
      connect();
    }, retryMs);
  };

  watch(
    () => auth.isAuthenticated,
    (ok) => {
      if (ok) connect();
      else disconnect();
    },
    { immediate: true },
  );

  // Reconnect after silent token refresh (same auth flag, new token in localStorage)
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'token' && auth.isAuthenticated) connect();
  };
  window.addEventListener('storage', onStorage);

  onUnmounted(() => {
    window.removeEventListener('storage', onStorage);
    disconnect();
  });
}
