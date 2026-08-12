<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { AppNotification } from '../api/types.js';
import {
  notificationHref,
  notificationLabel,
  useMarkNotificationsRead,
  useNotificationList,
} from '../composables/useNotifications.js';

const page = ref(1);
const { data, isPending, error, refetch } = useNotificationList(page);
const markRead = useMarkNotificationsRead();
const router = useRouter();

const items = computed(() => data.value?.data ?? []);
const totalPages = computed(() => data.value?.totalPages ?? 1);

const formatTimeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const snippetOf = (n: AppNotification) => {
  const p = n.payload;
  if (!p) return '';
  if (typeof p.snippet === 'string') return p.snippet;
  if (typeof p.label === 'string') return String(p.icon ?? '') + ' ' + p.label;
  if (typeof p.threadTitle === 'string') return p.threadTitle;
  return '';
};

async function openNotification(n: AppNotification) {
  if (!n.readAt) {
    try {
      await markRead.mutateAsync({ ids: [n.id] });
    } catch {
      /* still navigate */
    }
  }
  const href = notificationHref(n);
  if (href) await router.push(href);
}

async function markAll() {
  await markRead.mutateAsync({ all: true });
  await refetch();
}
</script>

<template>
  <div class="flex min-h-screen w-full justify-center">
    <div class="w-full max-w-2xl mx-auto pt-24 px-4 sm:px-6 pb-12">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-extrabold text-(--color-heading)">Notifications</h1>
          <p class="text-sm text-(--color-text-muted) mt-1">กิจกรรมที่เกี่ยวกับคุณ</p>
        </div>
        <button
          type="button"
          class="text-xs font-medium text-sky-600 dark:text-sky-400 border border-sky-500/30 px-3 py-1.5 rounded-full hover:bg-sky-500/10 transition-colors disabled:opacity-50"
          :disabled="markRead.isPending.value || items.length === 0"
          @click="markAll"
        >
          Mark all read
        </button>
      </div>

      <div v-if="isPending" class="space-y-2">
        <div v-for="i in 5" :key="i" class="glass p-4 animate-pulse">
          <div class="h-4 bg-(--color-background-mute) rounded w-2/3 mb-2" />
          <div class="h-3 bg-(--color-background-mute) rounded w-1/3" />
        </div>
      </div>

      <div
        v-else-if="error"
        class="bg-red-500/10 text-(--color-error) rounded-xl p-6 border border-red-500/20"
      >
        <p class="font-medium">โหลดการแจ้งเตือนไม่สำเร็จ</p>
        <p class="text-sm mt-1">{{ (error as Error).message }}</p>
      </div>

      <div v-else-if="items.length === 0" class="glass p-10 text-center text-(--color-text-muted)">
        <p class="font-medium text-(--color-heading)">ยังไม่มีการแจ้งเตือน</p>
        <p class="text-sm mt-1">เมื่อมีคนตอบกระทู้ของคุณ จะแสดงที่นี่</p>
      </div>

      <div v-else class="glass overflow-hidden divide-y divide-(--color-border)">
        <button
          v-for="n in items"
          :key="n.id"
          type="button"
          class="w-full text-left px-4 py-3 hover:bg-(--color-background-mute) transition-colors flex gap-3 items-start"
          :class="!n.readAt ? 'bg-sky-500/5' : ''"
          @click="openNotification(n)"
        >
          <span
            class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
            :class="n.readAt ? 'bg-transparent' : 'bg-sky-500'"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-(--color-heading)">
              {{ notificationLabel(n.type, n.actor?.name) }}
            </p>
            <p v-if="snippetOf(n)" class="text-sm text-(--color-text-muted) line-clamp-2 mt-0.5">
              {{ snippetOf(n) }}
            </p>
            <p class="text-xs text-(--color-text-muted) mt-1">{{ formatTimeAgo(n.createdAt) }}</p>
          </div>
        </button>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center gap-3 mt-6">
        <button
          type="button"
          class="text-sm px-3 py-1 rounded-full border border-(--color-border) disabled:opacity-40"
          :disabled="page <= 1"
          @click="page -= 1"
        >
          Previous
        </button>
        <span class="text-sm text-(--color-text-muted) self-center">{{ page }} / {{ totalPages }}</span>
        <button
          type="button"
          class="text-sm px-3 py-1 rounded-full border border-(--color-border) disabled:opacity-40"
          :disabled="page >= totalPages"
          @click="page += 1"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
