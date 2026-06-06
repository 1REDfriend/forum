<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { threadsApi, postsApi, likesApi } from '../api/index.js';
import type { ThreadDetail, PostDetail, PaginatedResponse } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';
import { useRouter } from 'vue-router';
import MarkdownRenderer from '../components/MarkdownRenderer.vue';
import MarkdownEditor from '../components/MarkdownEditor.vue';
import ProfileCard from '../components/ProfileCard.vue';
import ReportButton from '../components/ReportButton.vue';

const props = defineProps<{ id: string }>();

const router = useRouter();
const authStore = useAuthStore();
const thread = ref<ThreadDetail | null>(null);
const posts = ref<PostDetail[]>([]);
const error = ref('');
const isLoading = ref(true);

// Reply
const replyContent = ref('');
const isReplying = ref(false);
const replyError = ref('');

// Edit thread
const isEditingThread = ref(false);
const editThreadTitle = ref('');
const editThreadContent = ref('');
const editThreadError = ref('');
const isSavingThread = ref(false);

// Edit post
const editingPostId = ref<string | null>(null);
const editPostContent = ref('');
const editPostError = ref('');
const isSavingPost = ref(false);

// Delete
const confirmDeleteType = ref<'thread' | 'post' | null>(null);
const confirmDeleteId = ref<string | null>(null);
const isDeleting = ref(false);

// Pagination
const currentPage = ref(1);
const totalPages = ref(1);
const total = ref(0);
const limit = 20;

// Like states
const threadLikeCount = ref(0);
const threadIsLiked = ref(false);
const isLikingThread = ref(false);
const likingPostId = ref<string | null>(null);

const isAdmin = computed(() => authStore.user?.role === 'admin');
const isThreadOwnerOrAdmin = computed(() =>
  authStore.user && thread.value &&
  (authStore.user.id === thread.value.author.id || authStore.user.role === 'admin')
);

const isPostOwnerOrAdmin = (post: PostDetail) =>
  authStore.user && (authStore.user.id === post.author.id || authStore.user.role === 'admin');

const loadData = async (page = 1) => {
  isLoading.value = true;
  error.value = '';
  try {
    const threadId = props.id;
    const [threadData, postsData] = await Promise.all([
      threadsApi.getThreadById(threadId),
      postsApi.getPostsByThreadId(threadId, page, limit),
    ]);
    thread.value = threadData;
    posts.value = (postsData as PaginatedResponse<PostDetail>).data;
    currentPage.value = (postsData as PaginatedResponse<PostDetail>).page;
    totalPages.value = (postsData as PaginatedResponse<PostDetail>).totalPages;
    total.value = (postsData as PaginatedResponse<PostDetail>).total;
    // Initialize like state from server data
    threadLikeCount.value = (threadData as any).likeCount ?? 0;
    threadIsLiked.value = (threadData as any).isLikedByMe ?? false;
  } catch (err: any) {
    error.value = err.message || 'Failed to load thread';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => loadData());

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) loadData(page);
};

// Reply
const submitReply = async () => {
  if (!replyContent.value.trim()) return;
  isReplying.value = true;
  replyError.value = '';
  try {
    await postsApi.createPost({ content: replyContent.value, threadId: props.id });
    replyContent.value = '';
    await loadData(currentPage.value);
  } catch (err: any) {
    replyError.value = err.message || 'Failed to post reply';
  } finally {
    isReplying.value = false;
  }
};

// Edit thread
const startEditThread = () => {
  if (!thread.value) return;
  editThreadTitle.value = thread.value.title;
  editThreadContent.value = thread.value.content;
  isEditingThread.value = true;
  editThreadError.value = '';
};

const cancelEditThread = () => { isEditingThread.value = false; editThreadError.value = ''; };

const saveEditThread = async () => {
  if (!thread.value) return;
  isSavingThread.value = true;
  editThreadError.value = '';
  try {
    await threadsApi.updateThread(thread.value.id, { title: editThreadTitle.value, content: editThreadContent.value });
    await loadData(currentPage.value);
    isEditingThread.value = false;
  } catch (err: any) {
    editThreadError.value = err.message || 'Failed to update thread';
  } finally {
    isSavingThread.value = false;
  }
};

// Edit post
const startEditPost = (post: PostDetail) => {
  editingPostId.value = post.id;
  editPostContent.value = post.content;
  editPostError.value = '';
};

const cancelEditPost = () => { editingPostId.value = null; editPostError.value = ''; };

const saveEditPost = async () => {
  if (!editingPostId.value) return;
  isSavingPost.value = true;
  editPostError.value = '';
  try {
    await postsApi.updatePost(editingPostId.value, { content: editPostContent.value });
    await loadData(currentPage.value);
    editingPostId.value = null;
  } catch (err: any) {
    editPostError.value = err.message || 'Failed to update post';
  } finally {
    isSavingPost.value = false;
  }
};

// Delete
const showDeleteConfirm = (type: 'thread' | 'post', id: string) => {
  confirmDeleteType.value = type;
  confirmDeleteId.value = id;
};

const cancelDelete = () => { confirmDeleteType.value = null; confirmDeleteId.value = null; };

const confirmDelete = async () => {
  if (!confirmDeleteId.value || !confirmDeleteType.value) return;
  isDeleting.value = true;
  try {
    if (confirmDeleteType.value === 'thread') {
      await threadsApi.deleteThread(confirmDeleteId.value);
      if (thread.value) router.push(`/forum/${thread.value.forum.id}`);
      else router.push('/');
      return;
    } else {
      await postsApi.deletePost(confirmDeleteId.value);
      await loadData(currentPage.value);
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to delete';
  } finally {
    isDeleting.value = false;
    cancelDelete();
  }
};

// Like thread
const toggleThreadLike = async () => {
  if (!authStore.isAuthenticated || !thread.value || isLikingThread.value) return;
  isLikingThread.value = true;
  try {
    const result = await likesApi.toggleThreadLike(thread.value.id);
    threadIsLiked.value = result.liked;
    threadLikeCount.value = result.likeCount;
  } catch { /* silent */ } finally {
    isLikingThread.value = false;
  }
};

// Like post
const togglePostLike = async (post: PostDetail) => {
  if (!authStore.isAuthenticated || likingPostId.value === post.id) return;
  likingPostId.value = post.id;
  try {
    const result = await likesApi.togglePostLike(post.id);
    const idx = posts.value.findIndex(p => p.id === post.id);
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx]!, likeCount: result.likeCount, isLikedByMe: result.liked };
    }
  } catch { /* silent */ } finally {
    likingPostId.value = null;
  }
};

// Admin: Pin/Lock
const isPinning = ref(false);
const isLocking = ref(false);

const togglePin = async () => {
  if (!thread.value || isPinning.value) return;
  isPinning.value = true;
  try {
    await threadsApi.pinThread(thread.value.id);
    thread.value = { ...thread.value, isPinned: !thread.value.isPinned };
  } catch (err: any) {
    error.value = err.message || 'Failed to toggle pin';
  } finally {
    isPinning.value = false;
  }
};

const toggleLock = async () => {
  if (!thread.value || isLocking.value) return;
  isLocking.value = true;
  try {
    await threadsApi.lockThread(thread.value.id);
    thread.value = { ...thread.value, isLocked: !thread.value.isLocked };
  } catch (err: any) {
    error.value = err.message || 'Failed to toggle lock';
  } finally {
    isLocking.value = false;
  }
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <main class="flex items-center w-screen flex-col min-h-screen py-8 sm:px-6 lg:px-8 pt-24">
    <div v-if="isLoading" class="sm:mx-auto sm:w-full sm:max-w-4xl space-y-4">
      <div class="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 animate-pulse">
        <div class="h-6 bg-white/10 rounded w-2/3 mb-4"></div>
        <div class="h-4 bg-white/10 rounded w-1/4 mb-6"></div>
        <div class="h-20 bg-white/10 rounded"></div>
      </div>
    </div>

    <div v-else-if="error && !thread" class="text-center py-12">
      <div class="bg-red-500/10 text-red-300 rounded-xl p-6 border border-red-500/20 max-w-md mx-auto">
        <p class="font-medium">{{ error }}</p>
        <router-link to="/forums" class="text-sky-400 hover:underline text-sm mt-2 inline-block">← Back to Home</router-link>
      </div>
    </div>

    <div v-else-if="thread" class="sm:mx-auto sm:w-full sm:max-w-4xl space-y-6">

      <!-- Breadcrumbs -->
      <nav class="text-sm text-slate-400 mb-4 flex items-center gap-1 flex-wrap">
        <router-link to="/forums" class="hover:text-sky-400">Forums</router-link>
        <span>›</span>
        <router-link :to="`/forum/${thread.forum.id}`" class="hover:text-sky-400">{{ thread.forum.name
        }}</router-link>
        <span>›</span>
        <span class="text-slate-200 font-medium truncate max-w-[240px]">{{ thread.title }}</span>
        <!-- Badges -->
        <span v-if="thread.isPinned"
          class="ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300">📌
          Pinned</span>
        <span v-if="thread.isLocked"
          class="ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-300">🔒
          Locked</span>
      </nav>

      <!-- Main Thread Post -->
      <div class="flex flex-col sm:flex-row gap-4 items-start">
        <div class="w-full sm:w-52 sm:flex-shrink-0">
          <ProfileCard :author="thread.author" />
        </div>
        <div class="flex-1 min-w-0 w-full bg-white/5 backdrop-blur-xl shadow-sm sm:rounded-xl border border-white/10 overflow-hidden">
        <div class="p-6 border-b border-white/10 bg-white/5">
          <!-- View Mode -->
          <template v-if="!isEditingThread">
            <h1 class="text-2xl font-bold text-slate-100 mb-2">{{ thread.title }}</h1>
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center text-sm text-slate-400 gap-3">
                <span class="font-medium text-sky-400">@{{ thread.author.name }}</span>
                <span>•</span>
                <span>{{ formatDate(thread.createdAt) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Like thread button -->
                <button v-if="authStore.isAuthenticated" @click="toggleThreadLike" :disabled="isLikingThread" :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  threadIsLiked
                    ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20'
                ]">
                  <span>{{ threadIsLiked ? '👍' : '👍' }}</span>
                  <span>{{ threadLikeCount }}</span>
                </button>
                <!-- Admin controls -->
                <template v-if="isAdmin">
                  <button @click="togglePin" :disabled="isPinning"
                    class="text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors">
                    {{ thread.isPinned ? '📌 Unpin' : '📌 Pin' }}
                  </button>
                  <button @click="toggleLock" :disabled="isLocking"
                    class="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors">
                    {{ thread.isLocked ? '🔓 Unlock' : '🔒 Lock' }}
                  </button>
                </template>
                <!-- Owner/Admin edit/delete -->
                <template v-if="isThreadOwnerOrAdmin">
                  <button @click="startEditThread"
                    class="text-sm text-slate-400 hover:text-sky-400 transition-colors px-2 py-1">Edit</button>
                  <button @click="showDeleteConfirm('thread', thread.id)"
                    class="text-sm text-slate-400 hover:text-red-400 transition-colors px-2 py-1">Delete</button>
                </template>
                <ReportButton v-if="!isThreadOwnerOrAdmin" target-type="thread" :target-id="thread.id" />
              </div>
            </div>
          </template>
          <!-- Edit Mode -->
          <template v-else>
            <div v-if="editThreadError" class="p-3 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md text-sm mb-3">{{ editThreadError }}
            </div>
            <input v-model="editThreadTitle"
              class="w-full text-2xl font-bold text-slate-100 mb-3 px-3 py-2 border border-white/15 bg-white/5 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500" />
          </template>
        </div>
        <div class="p-6">
          <template v-if="!isEditingThread">
            <MarkdownRenderer :content="thread.content" />
          </template>
          <template v-else>
            <MarkdownEditor v-model="editThreadContent" :rows="8" />
            <div class="flex gap-2 mt-3 justify-end">
              <button @click="cancelEditThread"
                class="px-4 py-2 text-sm text-slate-400 border border-white/15 rounded-md hover:bg-white/10">Cancel</button>
              <button @click="saveEditThread" :disabled="isSavingThread"
                class="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
                {{ isSavingThread ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </template>
        </div>
        </div>
      </div>

      <!-- Error banner -->
      <div v-if="error && thread" class="p-3 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md text-sm">{{ error }}</div>

      <!-- Replies list -->
      <div class="space-y-4 pb-5">
        <h3 class="text-lg font-semibold text-slate-300 pl-2">Replies ({{ total }})</h3>

        <div v-if="posts.length === 0"
          class="bg-white/5 backdrop-blur-xl shadow-sm sm:rounded-xl border border-white/10 p-8 text-center text-slate-400">
          <p>No replies yet. Be the first to respond!</p>
        </div>

        <div v-for="post in posts" :key="post.id" class="flex flex-col sm:flex-row gap-4 pb-4 items-start">
          <div class="w-full sm:w-52 sm:flex-shrink-0">
            <ProfileCard :author="post.author" />
          </div>
          <div class="flex-1 min-w-0 w-full bg-white/5 backdrop-blur-xl shadow-sm sm:rounded-xl border border-white/10 overflow-hidden">
          <div class="px-6 py-3 border-b border-white/10 bg-white/5 flex justify-between items-center text-sm">
            <span class="font-medium text-sky-400">@{{ post.author.name }}</span>
            <div class="flex items-center gap-3">
              <span class="text-slate-500">{{ formatDate(post.createdAt) }}</span>
              <!-- Like post button -->
              <button v-if="authStore.isAuthenticated && editingPostId !== post.id" @click="togglePostLike(post)"
                :disabled="likingPostId === post.id" :class="[
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
                  post.isLikedByMe
                    ? 'bg-sky-500/15 text-sky-300'
                    : 'text-slate-500 hover:text-sky-300 hover:bg-white/10'
                ]">
                👍 {{ post.likeCount || 0 }}
              </button>
              <span v-else-if="!authStore.isAuthenticated && (post.likeCount ?? 0) > 0" class="text-slate-500 text-xs">
                👍 {{ post.likeCount }}
              </span>
              <!-- Edit/Delete -->
              <template v-if="isPostOwnerOrAdmin(post) && editingPostId !== post.id">
                <button @click="startEditPost(post)"
                  class="text-slate-500 hover:text-sky-400 transition-colors">Edit</button>
                <button @click="showDeleteConfirm('post', post.id)"
                  class="text-slate-500 hover:text-red-400 transition-colors">Delete</button>
              </template>
              <ReportButton v-if="!isPostOwnerOrAdmin(post) && editingPostId !== post.id" target-type="post" :target-id="post.id" />
            </div>
          </div>
          <!-- Post View Mode -->
          <div v-if="editingPostId !== post.id" class="p-6">
            <MarkdownRenderer :content="post.content" />
          </div>
          <!-- Post Edit Mode -->
          <div v-else class="p-6">
            <div v-if="editPostError" class="p-3 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md text-sm mb-3">{{ editPostError }}
            </div>
            <MarkdownEditor v-model="editPostContent" :rows="4" />
            <div class="flex gap-2 mt-3 justify-end">
              <button @click="cancelEditPost"
                class="px-4 py-2 text-sm text-slate-400 border border-white/15 rounded-md hover:bg-white/10">Cancel</button>
              <button @click="saveEditPost" :disabled="isSavingPost"
                class="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
                {{ isSavingPost ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-4">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1"
          class="px-3 py-2 text-sm rounded-lg border border-white/15 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          ← Prev
        </button>
        <span class="text-sm text-slate-400 px-2">Page {{ currentPage }} / {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages"
          class="px-3 py-2 text-sm rounded-lg border border-white/15 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next →
        </button>
      </div>

      <!-- Reply Box -->
      <div v-if="authStore.isAuthenticated && !thread.isLocked"
        class="bg-white/5 backdrop-blur-xl shadow-sm sm:rounded-xl border border-white/10 p-6 mt-8">
        <h3 class="text-lg font-medium text-slate-100 mb-4">Post a Reply</h3>
        <form @submit.prevent="submitReply">
          <div v-if="replyError" class="p-3 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md text-sm mb-3">{{ replyError }}</div>
          <MarkdownEditor v-model="replyContent" placeholder="Write your reply here... Markdown is supported."
            :rows="5" />
          <div class="mt-4 flex justify-end">
            <button type="submit" :disabled="isReplying || !replyContent.trim()"
              class="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {{ isReplying ? 'Posting...' : 'Reply' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Locked notice -->
      <div v-else-if="thread.isLocked" class="bg-amber-500/10 border border-amber-500/25 rounded-xl p-5 text-center mt-8">
        <p class="text-amber-300 font-medium">🔒 This thread has been locked. No new replies can be posted.</p>
      </div>

      <!-- Not logged in -->
      <div v-else class="bg-white/5 border border-white/10 rounded-xl p-6 text-center mt-8">
        <p class="text-slate-400 mb-4">You must be logged in to reply to this thread.</p>
        <router-link to="/login"
          class="inline-block py-2 px-6 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
          Sign In to Reply
        </router-link>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="confirmDeleteType"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-sm mx-4 shadow-xl">
          <h3 class="text-lg font-bold text-slate-100 mb-2">Confirm Delete</h3>
          <p class="text-slate-400 mb-6">Are you sure you want to delete this {{ confirmDeleteType }}? This action cannot
            be
            undone.</p>
          <div class="flex gap-3 justify-end">
            <button @click="cancelDelete"
              class="px-4 py-2 text-sm text-slate-400 border border-white/15 rounded-md hover:bg-white/10">Cancel</button>
            <button @click="confirmDelete" :disabled="isDeleting"
              class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50">
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>
