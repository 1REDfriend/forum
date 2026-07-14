<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ForumWithStats } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';
import { useForums } from '../composables/useForums.js';

const { data: forumsData, isPending: isLoading, error: forumsError } = useForums();
const forums = computed<ForumWithStats[]>(() => forumsData.value ?? []);
const error = computed(() => (forumsError.value ? (forumsError.value as Error).message || 'Failed to load forums' : ''));
const authStore = useAuthStore();

// Mark as Read (localStorage-based)
const READ_STORAGE_KEY = 'forum_read_timestamps';

const getReadTimestamps = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '{}');
  } catch { return {}; }
};

const readTimestamps = ref<Record<string, number>>(getReadTimestamps());

const isForumUnread = (forum: ForumWithStats): boolean => {
  if (!forum.lastPostAt) return false;
  const readAt = readTimestamps.value[`forum_${forum.id}`];
  if (!readAt) return true;
  return new Date(forum.lastPostAt).getTime() > readAt;
};

const markForumRead = (forum: ForumWithStats, e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  const ts = { ...readTimestamps.value, [`forum_${forum.id}`]: Date.now() };
  readTimestamps.value = ts;
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ts));
};

const markAllRead = () => {
  const ts = { ...readTimestamps.value };
  for (const forum of forums.value) {
    ts[`forum_${forum.id}`] = Date.now();
  }
  readTimestamps.value = ts;
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ts));
};

const anyUnread = computed(() => forums.value.some(f => isForumUnread(f)));

const formatTimeAgo = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};
</script>

<template>
  <div class="flex min-h-screen w-full justify-center">
    <div class="w-full max-w-5xl mx-auto pt-24 px-4 sm:px-6 pb-12">

      <!-- Header -->
      <div class="md:hidden flex justify-center items-center pb-6">
        <div>
          <h1 class="text-3xl font-extrabold text-(--color-heading)">Discussion Forums</h1>
          <p class="text-lg text-(--color-text-muted) mt-1">Browse all discussion categories</p>
        </div>
      </div>
      <div class="flex justify-between items-center pb-6">
        <div class="max-md:hidden">
          <h1 class="text-2xl font-extrabold text-(--color-heading)">Discussion Forums</h1>
          <p class="text-sm text-(--color-text-muted) mt-1">Browse all discussion categories</p>
        </div>
        <div class="flex items-center gap-3">
          <button v-if="anyUnread" @click="markAllRead"
            class="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium border border-sky-500/30 hover:border-sky-500/50 px-3 py-1.5 rounded-full transition-colors">
            ✓ Mark All Read
          </button>
          <router-link v-if="authStore.isAuthenticated" to="/forum/create"
            class="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-full shadow-sm text-sm font-medium transition-colors">
            + New Forum
          </router-link>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="glass p-5 animate-pulse">
          <div class="flex gap-4">
            <div class="w-10 h-10 rounded-full bg-(--color-background-mute) flex-shrink-0"></div>
            <div class="flex-1">
              <div class="h-4 bg-(--color-background-mute) rounded w-1/3 mb-2"></div>
              <div class="h-3 bg-(--color-background-mute) rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-12">
        <div class="bg-red-500/10 text-(--color-error) rounded-xl p-6 border border-red-500/20">
          <p class="font-medium">Failed to load forums</p>
          <p class="text-sm mt-1">{{ error }}</p>
        </div>
      </div>

      <!-- Forum Table -->
      <div v-else class="glass overflow-hidden">

        <!-- Column Headers -->
        <div
          class="hidden sm:grid grid-cols-12 gap-2 h-10 bg-(--color-background-soft) border-b border-(--color-border) text-xs uppercase tracking-wider font-semibold text-(--color-text-muted) px-5 items-center select-none">
          <div class="col-span-5">Forum</div>
          <div class="col-span-2 text-center">Threads</div>
          <div class="col-span-2 text-center">Posts</div>
          <div class="col-span-3">Last Post</div>
        </div>

        <!-- Empty -->
        <div v-if="forums.length === 0" class="p-10 text-center text-(--color-text-muted)">
          <svg class="h-12 w-12 mx-auto mb-3 text-(--color-text-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p class="font-medium text-(--color-text-muted)">No forums yet</p>
          <p class="text-sm mt-1">Be the first to create a discussion forum!</p>
        </div>

        <!-- Forum Rows -->
        <div v-for="forum in forums" :key="forum.id"
          class="grid grid-cols-12 gap-2 border-b border-(--color-border) last:border-0 hover:bg-(--color-background-mute) transition-colors group relative px-5 py-4 items-center">

          <!-- Forum info -->
          <div class="col-span-12 sm:col-span-5 flex items-start gap-3 min-w-0">
            <!-- Unread indicator dot -->
            <div class="flex-shrink-0 mt-1 relative">
              <div :class="[
                'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm',
                isForumUnread(forum) ? 'bg-indigo-600' : 'bg-(--color-background-mute)'
              ]">
                <span :class="isForumUnread(forum) ? 'text-white' : 'text-sky-600 dark:text-sky-400'">
                  {{ forum.name.charAt(0).toUpperCase() }}
                </span>
              </div>
              <span v-if="isForumUnread(forum)"
                class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-(--color-background)"></span>
            </div>
            <div class="min-w-0 flex-1">
              <router-link :to="`/forum/${forum.id}`"
                class="font-bold text-(--color-heading) group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors text-base leading-tight block truncate">
                {{ forum.name }}
              </router-link>
              <p v-if="forum.description" class="text-xs text-(--color-text-muted) mt-0.5 line-clamp-1">{{ forum.description }}</p>
              <!-- Mobile stats -->
              <div class="flex items-center gap-3 mt-1 sm:hidden text-xs text-(--color-text-muted)">
                <span>{{ forum.threadCount ?? 0 }} threads</span>
                <span>{{ forum.postCount ?? 0 }} posts</span>
                <span v-if="forum.lastPostAt" class="text-sky-600 dark:text-sky-400">{{ formatTimeAgo(forum.lastPostAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Threads -->
          <div class="hidden sm:flex col-span-2 justify-center items-center">
            <span class="text-sm font-semibold text-(--color-text)">{{ forum.threadCount ?? 0 }}</span>
          </div>

          <!-- Posts -->
          <div class="hidden sm:flex col-span-2 justify-center items-center">
            <span class="text-sm font-semibold text-(--color-text)">{{ forum.postCount ?? 0 }}</span>
          </div>

          <!-- Last Post -->
          <div class="hidden sm:flex col-span-3 items-center gap-2 min-w-0">
            <div v-if="forum.lastPostAt" class="min-w-0 flex-1">
              <p class="text-xs font-medium text-(--color-text) truncate">
                <span class="text-(--color-text-muted)">by</span> @{{ forum.lastPostAuthor ?? '—' }}
              </p>
              <p
                :class="['text-xs truncate', isForumUnread(forum) ? 'text-orange-500 font-semibold' : 'text-(--color-text-muted)']">
                {{ formatTimeAgo(forum.lastPostAt) }}
              </p>
            </div>
            <div v-else class="text-xs text-(--color-text-muted) italic">No posts yet</div>

            <!-- Mark as Read button -->
            <button v-if="isForumUnread(forum)" @click="markForumRead(forum, $event)" title="Mark as read"
              class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-(--color-text-muted) hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-500/10 transition-all opacity-0 group-hover:opacity-100">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>

          <!-- Mobile mark as read -->
          <button v-if="isForumUnread(forum)" @click="markForumRead(forum, $event)"
            class="absolute top-3 right-3 sm:hidden text-xs text-sky-600 dark:text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">
            Mark read
          </button>
        </div>
      </div>
    </div>
  </div>
</template>