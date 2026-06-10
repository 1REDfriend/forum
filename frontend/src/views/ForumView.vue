<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { threadsApi, forumsApi } from '../api/index.js';
import type { ThreadDetail, Forum, PaginatedResponse } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js'
import { setPageMeta } from '../utils/meta.js';

const props = defineProps<{
  forum: string
}>();

const authStore = useAuthStore();
const threads = ref<ThreadDetail[]>([]);
const forumData = ref<Forum | null>(null);
const isLoading = ref(true);
const error = ref('');

// Pagination
const currentPage = ref(1);
const totalPages = ref(1);
const total = ref(0);
const limit = 15;

// Mark as Read (localStorage-based)
const READ_STORAGE_KEY = 'forum_read_timestamps';

const getReadTimestamps = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '{}');
  } catch { return {}; }
};

const readTimestamps = ref<Record<string, number>>(getReadTimestamps());

const isThreadUnread = (thread: ThreadDetail): boolean => {
  const activity = thread.lastPostAt || thread.createdAt;
  const readAt = readTimestamps.value[`thread_${thread.id}`];
  if (!readAt) return true;
  return new Date(activity).getTime() > readAt;
};

const markThreadRead = (thread: ThreadDetail, e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  const ts = { ...readTimestamps.value, [`thread_${thread.id}`]: Date.now() };
  readTimestamps.value = ts;
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ts));
};

const markAllThreadsRead = () => {
  const ts = { ...readTimestamps.value };
  for (const t of threads.value) {
    ts[`thread_${t.id}`] = Date.now();
  }
  // Also mark the forum as read
  ts[`forum_${props.forum}`] = Date.now();
  readTimestamps.value = ts;
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ts));
};

const anyUnread = computed(() => threads.value.some(t => isThreadUnread(t)));

const loadData = async (page = 1) => {
  isLoading.value = true;
  error.value = '';
  try {
    const forumId = props.forum;
    if (!forumData.value) {
      forumData.value = await forumsApi.getForumById(forumId);
      if (forumData.value) {
        setPageMeta({
          title: forumData.value.name,
          description: forumData.value.description ?? `Discussions in ${forumData.value.name} on IT.Forum.`,
        })
      }
    }
    const result: PaginatedResponse<ThreadDetail> = await threadsApi.getThreadsByForumId(forumId, page, limit);
    threads.value = result.data;
    currentPage.value = result.page;
    totalPages.value = result.totalPages;
    total.value = result.total;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    error.value = err.message || 'Failed to load threads';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => loadData());

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) loadData(page);
};

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
  <main class="flex justify-center min-h-screen pb-12">
    <div class="w-full max-w-5xl mx-auto pt-24 px-4 sm:px-6">

      <!-- Breadcrumb -->
      <nav class="text-sm text-slate-400 mb-4 flex items-center gap-1">
        <router-link to="/forums" class="hover:text-sky-400">Home</router-link>
        <span class="text-slate-600">›</span>
        <span class="text-slate-200 font-medium" v-if="forumData">{{ forumData.name }}</span>
      </nav>

      <!-- Header -->
      <div class="flex justify-between items-start pb-6 gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-100" v-if="forumData">{{ forumData.name }}</h1>
          <h1 class="text-2xl font-extrabold text-slate-100" v-else>Loading...</h1>
          <p class="text-slate-400 mt-1 text-sm" v-if="forumData?.description">{{ forumData.description }}</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <button v-if="anyUnread" @click="markAllThreadsRead"
            class="text-xs text-sky-400 hover:text-sky-300 font-medium border border-sky-500/30 hover:border-sky-500/50 px-3 py-1.5 rounded-full transition-colors">
            ✓ Mark All Read
          </button>
          <router-link v-if="authStore.isAuthenticated && forumData" :to="`/forum/${forumData.id}/create-thread`"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-sm text-sm font-medium transition-colors whitespace-nowrap">
            + New Thread
          </router-link>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 animate-pulse">
          <div class="flex gap-4">
            <div class="w-10 h-10 rounded-full bg-white/10 flex-shrink-0"></div>
            <div class="flex-1">
              <div class="h-4 bg-white/10 rounded w-2/3 mb-2"></div>
              <div class="h-3 bg-white/10 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-500/10 text-red-300 rounded-xl p-6 border border-red-500/20 text-center">
        <p class="font-medium">{{ error }}</p>
      </div>

      <!-- Thread Table -->
      <div v-else class="bg-white/5 backdrop-blur-xl shadow-sm border border-white/10 rounded-xl overflow-hidden">

        <!-- Column Headers -->
        <div
          class="hidden md:grid grid-cols-12 gap-2 h-10 bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider font-semibold text-slate-500 px-5 items-center select-none">
          <div class="col-span-5">Topic</div>
          <div class="col-span-2 text-center">Author</div>
          <div class="col-span-1 text-center">Replies</div>
          <div class="col-span-4">Last Reply</div>
        </div>

        <!-- Empty -->
        <div v-if="threads.length === 0" class="p-10 text-center text-slate-500">
          <svg class="h-12 w-12 mx-auto mb-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <p class="font-medium text-slate-400">No threads yet</p>
          <p class="text-sm mt-1">Be the first to start a discussion!</p>
        </div>

        <!-- Thread Rows -->
        <div v-for="thread in threads" :key="thread.id"
          class="grid grid-cols-12 gap-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group relative px-5 py-4 items-center">

          <!-- Topic -->
          <div class="col-span-12 md:col-span-5 flex items-start gap-3 min-w-0 pt-5">
            <!-- Unread indicator -->
            <div class="flex-shrink-0 mt-0.5 relative">
              <div :class="[
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold',
                isThreadUnread(thread) ? 'bg-sky-500/15 text-sky-400' : 'bg-white/10 text-slate-500'
              ]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <span v-if="isThreadUnread(thread)"
                class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-slate-900"></span>
            </div>
            <!-- Title + badges -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span v-if="thread.isPinned"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-300">📌</span>
                <span v-if="thread.isLocked"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-500/15 text-red-300">🔒</span>
              </div>
              <router-link :to="`/thread/${thread.id}`" :class="[
                'font-bold text-base leading-tight block',
                isThreadUnread(thread)
                  ? 'text-sky-300 group-hover:text-sky-200'
                  : 'text-slate-200 group-hover:text-sky-400'
              ]" class="transition-colors">
                {{ thread.title }}
              </router-link>
              <!-- Mobile info -->
              <div class="flex items-center gap-2 mt-1 md:hidden text-xs text-slate-500 flex-wrap">
                <span>@{{ thread.author.name }}</span>
                <span class="text-slate-700">·</span>
                <span>{{ thread.replyCount ?? 0 }} replies</span>
                <span v-if="thread.lastPostAt" :class="isThreadUnread(thread) ? 'text-orange-500 font-semibold' : ''">
                  {{ formatTimeAgo(thread.lastPostAt) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Author -->
          <div class="hidden md:flex col-span-2 justify-center items-center">
            <span class="text-sm text-slate-400 truncate text-center">@{{ thread.author.name }}</span>
          </div>

          <!-- Replies -->
          <div class="hidden md:flex col-span-1 justify-center items-center">
            <span class="text-sm font-semibold text-slate-300">{{ thread.replyCount ?? 0 }}</span>
          </div>

          <!-- Last Reply -->
          <div class="hidden md:flex col-span-4 items-center gap-2 min-w-0">
            <div v-if="thread.lastPostAt || thread.lastPostAuthor" class="min-w-0 flex-1">
              <p class="text-xs font-medium text-slate-300 truncate">
                <span class="text-slate-500">by</span> @{{ thread.lastPostAuthor ?? thread.author.name }}
              </p>
              <p :class="['text-xs', isThreadUnread(thread) ? 'text-orange-500 font-semibold' : 'text-slate-500']">
                {{ formatTimeAgo(thread.lastPostAt ?? thread.createdAt) }}
              </p>
            </div>
            <div v-else class="text-xs text-slate-600 italic">No replies yet</div>

            <!-- Mark as Read button — hover reveal -->
            <button v-if="isThreadUnread(thread)" @click="markThreadRead(thread, $event)" title="Mark as read"
              class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:text-sky-300 hover:bg-sky-500/10 transition-all opacity-0 group-hover:opacity-100">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>

          <!-- Mobile mark read -->
          <button v-if="isThreadUnread(thread)" @click="markThreadRead(thread, $event)"
            class="absolute top-3 right-3 md:hidden text-xs text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">
            Mark read
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="!isLoading && !error && totalPages > 1" class="flex items-center justify-between mt-6">
        <p class="text-sm text-slate-400">
          Page {{ currentPage }} of {{ totalPages }} <span class="text-slate-500">({{ total }} threads)</span>
        </p>
        <div class="flex gap-2">
          <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1"
            class="px-3 py-2 text-sm rounded-lg border border-white/15 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Prev
          </button>
          <button v-for="page in totalPages" :key="page" @click="goToPage(page)" :class="[
            'px-3 py-2 text-sm rounded-lg border transition-colors',
            page === currentPage
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-white/15 hover:bg-white/5'
          ]">
            {{ page }}
          </button>
          <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages"
            class="px-3 py-2 text-sm rounded-lg border border-white/15 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Next →
          </button>
        </div>
      </div>

    </div>
  </main>
</template>