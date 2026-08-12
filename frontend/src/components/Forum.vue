<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { ActivityItem, ForumWithStats } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';
import { useForums } from '../composables/useForums.js';
import { usePublicStats, useRecentActivity } from '../composables/useActivity.js';
import PaginationBar from './PaginationBar.vue';

const { data: forumsData, isPending: isLoading, error: forumsError } = useForums();
const { data: statsData, isPending: statsLoading } = usePublicStats();
const { data: activityData, isPending: activityLoading } = useRecentActivity(15);

const allForums = computed<ForumWithStats[]>(() => forumsData.value ?? []);
const error = computed(() =>
  forumsError.value ? (forumsError.value as Error).message || 'Failed to load forums' : '',
);
const authStore = useAuthStore();
const activityItems = computed<ActivityItem[]>(() => activityData.value?.items ?? []);

// Client-side board pagination (API returns full list)
const boardsPage = ref(1);
const boardsPerPage = 10;
const boardsTotalPages = computed(() =>
  Math.max(1, Math.ceil(allForums.value.length / boardsPerPage)),
);
const forums = computed(() => {
  const start = (boardsPage.value - 1) * boardsPerPage;
  return allForums.value.slice(start, start + boardsPerPage);
});

const goBoardsPage = async (page: number) => {
  if (page < 1 || page > boardsTotalPages.value || page === boardsPage.value) return;
  boardsPage.value = page;
  await nextTick();
  document.getElementById('boards-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Mark as Read (localStorage-based) — replaced by server thread_reads in Phase C
const READ_STORAGE_KEY = 'forum_read_timestamps';

const getReadTimestamps = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
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
  for (const forum of allForums.value) {
    ts[`forum_${forum.id}`] = Date.now();
  }
  readTimestamps.value = ts;
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ts));
};

const anyUnread = computed(() => allForums.value.some((f) => isForumUnread(f)));

const formatTimeAgo = (dateStr: string | null | undefined) => {
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

const formatCount = (n: number | undefined) => {
  if (n === undefined || n === null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
};

const activityLink = (item: ActivityItem) => {
  if (item.kind === 'post') return `/thread/${item.threadId}#post-${item.id}`;
  return `/thread/${item.threadId}`;
};

const emptyForumCta = (forum: ForumWithStats) => {
  if (authStore.isAuthenticated) return `/forum/${forum.id}/create-thread`;
  return '/login';
};
</script>

<template>
  <div class="flex min-h-screen w-full justify-center">
    <div class="w-full max-w-5xl mx-auto pt-24 px-4 sm:px-6 pb-12">

      <!-- Header -->
      <div class="md:hidden flex justify-center items-center pb-4">
        <div class="text-center">
          <h1 class="text-3xl font-extrabold text-(--color-heading)">Discussion Forums</h1>
          <p class="text-lg text-(--color-text-muted) mt-1">กิจกรรมล่าสุดและหมวดสนทนา</p>
        </div>
      </div>
      <div class="flex justify-between items-center pb-4">
        <div class="max-md:hidden">
          <h1 class="text-2xl font-extrabold text-(--color-heading)">Discussion Forums</h1>
          <p class="text-sm text-(--color-text-muted) mt-1">กิจกรรมล่าสุดและหมวดสนทนา</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="anyUnread"
            type="button"
            @click="markAllRead"
            class="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium border border-sky-500/30 hover:border-sky-500/50 px-3 py-1.5 rounded-full transition-colors"
          >
            ✓ Mark All Read
          </button>
          <router-link
            v-if="authStore.canManageForums"
            to="/forum/create"
            class="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-full shadow-sm text-sm font-medium transition-colors"
          >
            + New Forum
          </router-link>
        </div>
      </div>

      <!-- Stats strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div
          v-for="stat in [
            { label: 'สมาชิก', value: statsData?.members },
            { label: 'กระทู้', value: statsData?.threads },
            { label: 'โพสต์', value: statsData?.posts },
            { label: 'ฟอรัม', value: statsData?.forums },
          ]"
          :key="stat.label"
          class="glass px-4 py-3 text-center"
        >
          <div class="text-xl font-extrabold text-(--color-heading) tabular-nums">
            {{ statsLoading ? '…' : formatCount(stat.value) }}
          </div>
          <div class="text-xs text-(--color-text-muted) mt-0.5">{{ stat.label }}</div>
        </div>
      </div>

      <!-- Recent activity -->
      <section class="mb-10">
        <div class="flex items-center justify-between mb-4 pt-1">
          <h2 class="text-sm font-bold uppercase tracking-wider text-(--color-text-muted) py-1">Recent activity</h2>
        </div>

        <div v-if="activityLoading" class="space-y-2">
          <div v-for="i in 4" :key="i" class="glass p-4 animate-pulse">
            <div class="h-3 bg-(--color-background-mute) rounded w-1/4 mb-2" />
            <div class="h-4 bg-(--color-background-mute) rounded w-2/3 mb-2" />
            <div class="h-3 bg-(--color-background-mute) rounded w-full" />
          </div>
        </div>

        <div v-else-if="activityItems.length === 0" class="glass p-8 text-center text-(--color-text-muted)">
          <p class="font-medium text-(--color-heading)">ยังไม่มีความเคลื่อนไหว</p>
          <p class="text-sm mt-1">Be the first to start a thread</p>
          <router-link
            :to="authStore.isAuthenticated ? '/forums' : '/login'"
            class="inline-block mt-3 text-sm text-sky-600 dark:text-sky-400 font-medium"
          >
            {{ authStore.isAuthenticated ? 'เลือกหมวดแล้วตั้งกระทู้' : 'เข้าสู่ระบบเพื่อเริ่มโพสต์' }}
          </router-link>
        </div>

        <div v-else class="glass overflow-y-auto max-h-80 divide-y divide-(--color-border) overscroll-contain">
          <router-link
            v-for="item in activityItems"
            :key="`${item.kind}-${item.id}`"
            :to="activityLink(item)"
            class="block px-4 py-3 hover:bg-(--color-background-mute) transition-colors"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-(--color-text-muted) mb-0.5">
                  <span class="font-medium text-sky-600 dark:text-sky-400">{{ item.forumName }}</span>
                  <span>·</span>
                  <span>{{ item.kind === 'thread' ? 'กระทู้ใหม่' : 'ตอบกลับ' }}</span>
                  <span>·</span>
                  <span>@{{ item.author.name }}</span>
                </div>
                <p class="font-semibold text-(--color-heading) truncate">{{ item.threadTitle }}</p>
                <p v-if="item.snippet" class="text-sm text-(--color-text-muted) line-clamp-2 mt-0.5">
                  {{ item.snippet }}
                </p>
              </div>
              <time class="text-xs text-(--color-text-muted) flex-shrink-0 whitespace-nowrap">
                {{ formatTimeAgo(item.createdAt) }}
              </time>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Boards -->
      <div id="boards-section" class="scroll-mt-24">
      <div class="flex items-center justify-between mb-4 mt-2 pt-2">
        <h2 class="text-sm font-bold uppercase tracking-wider text-(--color-text-muted) py-1">Boards</h2>
      </div>

      <PaginationBar
        v-if="!isLoading && !error"
        :page="boardsPage"
        :total-pages="boardsTotalPages"
        :total="allForums.length"
        item-label="boards"
        @change="goBoardsPage"
      />

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="glass p-5 animate-pulse">
          <div class="flex gap-4">
            <div class="w-10 h-10 rounded-full bg-(--color-background-mute) flex-shrink-0" />
            <div class="flex-1">
              <div class="h-4 bg-(--color-background-mute) rounded w-1/3 mb-2" />
              <div class="h-3 bg-(--color-background-mute) rounded w-2/3" />
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
          class="hidden sm:grid grid-cols-12 gap-2 h-10 bg-(--color-background-soft) border-b border-(--color-border) text-xs uppercase tracking-wider font-semibold text-(--color-text-muted) px-5 items-center select-none"
        >
          <div class="col-span-5">Forum</div>
          <div class="col-span-2 text-center">Threads</div>
          <div class="col-span-2 text-center">Posts</div>
          <div class="col-span-3">Last activity</div>
        </div>

        <!-- Empty -->
        <div v-if="allForums.length === 0" class="p-10 text-center text-(--color-text-muted)">
          <p class="font-medium text-(--color-text-muted)">No forums yet</p>
          <p class="text-sm mt-1">Be the first to create a discussion forum!</p>
        </div>

        <!-- Forum Rows -->
        <div
          v-for="forum in forums"
          :key="forum.id"
          class="grid grid-cols-12 gap-2 border-b border-(--color-border) last:border-0 hover:bg-(--color-background-mute) transition-colors group relative px-5 py-4 items-center"
        >
          <!-- Forum info -->
          <div class="col-span-12 sm:col-span-5 flex items-start gap-3 min-w-0">
            <div class="flex-shrink-0 mt-1 relative">
              <div
                :class="[
                  'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm',
                  isForumUnread(forum) ? 'bg-indigo-600' : 'bg-(--color-background-mute)',
                ]"
              >
                <span :class="isForumUnread(forum) ? 'text-white' : 'text-sky-600 dark:text-sky-400'">
                  {{ forum.name.charAt(0).toUpperCase() }}
                </span>
              </div>
              <span
                v-if="isForumUnread(forum)"
                class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-(--color-background)"
              />
            </div>
            <div class="min-w-0 flex-1">
              <router-link
                :to="`/forum/${forum.id}`"
                class="font-bold text-(--color-heading) group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors text-base leading-tight block truncate"
              >
                {{ forum.name }}
              </router-link>
              <p v-if="forum.description" class="text-xs text-(--color-text-muted) mt-0.5 line-clamp-1">
                {{ forum.description }}
              </p>
              <div class="flex items-center gap-3 mt-1 sm:hidden text-xs text-(--color-text-muted)">
                <span>{{ forum.threadCount ?? 0 }} threads</span>
                <span>{{ forum.postCount ?? 0 }} posts</span>
                <span v-if="forum.lastPostAt" class="text-sky-600 dark:text-sky-400">
                  {{ formatTimeAgo(forum.lastPostAt) }}
                </span>
              </div>
              <!-- Empty board CTA (mobile) -->
              <router-link
                v-if="(forum.threadCount ?? 0) === 0"
                :to="emptyForumCta(forum)"
                class="sm:hidden inline-block mt-1 text-xs text-sky-600 dark:text-sky-400 font-medium"
              >
                Be the first to start a thread →
              </router-link>
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

          <!-- Last activity -->
          <div class="hidden sm:flex col-span-3 items-center gap-2 min-w-0">
            <div v-if="forum.lastPostAt || forum.lastThreadTitle" class="min-w-0 flex-1">
              <router-link
                v-if="forum.lastThreadId"
                :to="`/thread/${forum.lastThreadId}`"
                class="text-xs font-medium text-(--color-heading) hover:text-sky-600 dark:hover:text-sky-400 truncate block"
              >
                {{ forum.lastThreadTitle || 'Untitled' }}
              </router-link>
              <p v-else class="text-xs font-medium text-(--color-text) truncate">
                {{ forum.lastThreadTitle || '—' }}
              </p>
              <p
                :class="[
                  'text-xs truncate',
                  isForumUnread(forum) ? 'text-orange-500 font-semibold' : 'text-(--color-text-muted)',
                ]"
              >
                <span v-if="forum.lastPostAuthor">@{{ forum.lastPostAuthor }} · </span>
                {{ formatTimeAgo(forum.lastPostAt) }}
              </p>
            </div>
            <div v-else class="text-xs min-w-0 flex-1">
              <p class="text-(--color-text-muted) italic">No threads yet</p>
              <router-link
                :to="emptyForumCta(forum)"
                class="text-sky-600 dark:text-sky-400 font-medium hover:underline"
              >
                Be the first to start a thread
              </router-link>
            </div>

            <button
              v-if="isForumUnread(forum)"
              type="button"
              title="Mark as read"
              @click="markForumRead(forum, $event)"
              class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-(--color-text-muted) hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-500/10 transition-all opacity-0 group-hover:opacity-100"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>

          <button
            v-if="isForumUnread(forum)"
            type="button"
            @click="markForumRead(forum, $event)"
            class="absolute top-3 right-3 sm:hidden text-xs text-sky-600 dark:text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full"
          >
            Mark read
          </button>
        </div>
      </div>

      <PaginationBar
        v-if="!isLoading && !error"
        class="mt-4"
        :page="boardsPage"
        :total-pages="boardsTotalPages"
        :total="allForums.length"
        item-label="boards"
        @change="goBoardsPage"
      />
      </div><!-- /boards-section -->
    </div>
  </div>
</template>
