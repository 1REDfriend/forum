<script setup lang="ts">
import { ref, reactive, computed, nextTick, watch } from 'vue';
import type { PostDetail } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';
import { useRouter } from 'vue-router';
import MarkdownRenderer from '../components/MarkdownRenderer.vue';
import MarkdownEditor from '../components/MarkdownEditor.vue';
import ProfileCard from '../components/ProfileCard.vue';
import ReportButton from '../components/ReportButton.vue';
import ShareButton from '../components/ShareButton.vue';
import { threadShareUrl, postShareUrl } from '../utils/share.js'
import { setPageMeta } from '../utils/meta.js';
import { useThread, useUpdateThread, useDeleteThread, usePinThread, useLockThread } from '../composables/useThreads.js';
import { useThreadPosts, useCreatePost, useUpdatePost, useDeletePost } from '../composables/usePosts.js';
import { useToggleThreadLike, useTogglePostLike } from '../composables/useLikes.js';

const props = defineProps<{ id: string }>();

const router = useRouter();
const authStore = useAuthStore();
const threadId = computed(() => props.id);

// Reply
const replyContent = ref('');

// Edit thread
const isEditingThread = ref(false);
const editThreadTitle = ref('');
const editThreadContent = ref('');

// Edit post
const editingPostId = ref<string | null>(null);
const editPostContent = ref('');

// Delete
const confirmDeleteType = ref<'thread' | 'post' | null>(null);
const confirmDeleteId = ref<string | null>(null);

// Pagination
const currentPage = ref(1);

// Data
const { data: thread, isPending: isThreadLoading, error: threadQueryError } = useThread(threadId);
const { data: postsResult, isPending: isPostsLoading, error: postsQueryError } = useThreadPosts(threadId, currentPage);

const posts = computed<PostDetail[]>(() => postsResult.value?.data ?? []);
const totalPages = computed(() => postsResult.value?.totalPages ?? 1);
const total = computed(() => postsResult.value?.total ?? 0);
const isLoading = computed(() => isThreadLoading.value || isPostsLoading.value);

// Mutations
const { mutate: createPostMutate, isPending: isReplying, error: createPostMutationError } = useCreatePost();
const { mutate: updateThreadMutate, isPending: isSavingThread, error: updateThreadMutationError } = useUpdateThread();
const { mutate: updatePostMutate, isPending: isSavingPost, error: updatePostMutationError } = useUpdatePost();
const { mutate: deleteThreadMutate, isPending: isDeletingThread, error: deleteThreadMutationError } = useDeleteThread();
const { mutate: deletePostMutate, isPending: isDeletingPost, error: deletePostMutationError } = useDeletePost();
const { mutate: pinThreadMutate, isPending: isPinning, error: pinThreadMutationError } = usePinThread();
const { mutate: lockThreadMutate, isPending: isLocking, error: lockThreadMutationError } = useLockThread();
const { mutate: toggleThreadLikeMutate, isPending: isLikingThread } = useToggleThreadLike();
const { mutate: togglePostLikeMutate } = useTogglePostLike();

const isDeleting = computed(() => isDeletingThread.value || isDeletingPost.value);

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : undefined);

const replyError = computed(() => errorMessage(createPostMutationError.value) ?? '');
const editThreadError = computed(() => errorMessage(updateThreadMutationError.value) ?? '');
const editPostError = computed(() => errorMessage(updatePostMutationError.value) ?? '');
// General banner: load failures + delete/pin/lock failures (mirrors the old shared `error` ref).
const error = computed(() => {
  const err =
    threadQueryError.value ||
    postsQueryError.value ||
    deleteThreadMutationError.value ||
    deletePostMutationError.value ||
    pinThreadMutationError.value ||
    lockThreadMutationError.value;
  return err ? errorMessage(err) ?? 'Something went wrong' : '';
});

// Track in-flight post-like requests per post id (not a single ref) so that
// liking post B while post A's toggle is still in flight doesn't prematurely
// re-enable A's button (or vice versa) when the other's request settles.
const likingPostIds = reactive(new Set<string>());
const isPostLiking = (postId: string) => likingPostIds.has(postId);

const isAdmin = computed(() => authStore.user?.role === 'admin');
const isThreadOwnerOrAdmin = computed(() =>
  authStore.user && thread.value &&
  (authStore.user.id === thread.value.author.id || authStore.user.role === 'admin')
);

const isPostOwnerOrAdmin = (post: PostDetail) =>
  authStore.user && (authStore.user.id === post.author.id || authStore.user.role === 'admin');

// Scroll to a deep-linked post (#post-<id>) once the thread/posts have loaded. Runs once.
let hasScrolledToHash = false;
watch(isLoading, async (loading) => {
  if (loading || hasScrolledToHash) return;
  hasScrolledToHash = true;
  const hash = window.location.hash; // e.g. "#post-<cuid>"
  if (hash.startsWith('#post-')) {
    await nextTick();
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('post-highlight');
      setTimeout(() => el.classList.remove('post-highlight'), 2000);
    }
  }
}, { immediate: true });

watch(thread, (t) => {
  if (t) {
    setPageMeta({
      title: t.title,
      description: t.content.replace(/\s+/g, ' ').trim().slice(0, 200),
    });
  }
}, { immediate: true });

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

// Reply
const submitReply = () => {
  if (!replyContent.value.trim()) return;
  createPostMutate({ content: replyContent.value, threadId: props.id }, {
    onSuccess: () => { replyContent.value = ''; },
  });
};

// Edit thread
const startEditThread = () => {
  if (!thread.value) return;
  editThreadTitle.value = thread.value.title;
  editThreadContent.value = thread.value.content;
  isEditingThread.value = true;
};

const cancelEditThread = () => { isEditingThread.value = false; };

const saveEditThread = () => {
  if (!thread.value) return;
  updateThreadMutate({ id: thread.value.id, data: { title: editThreadTitle.value, content: editThreadContent.value } }, {
    onSuccess: () => { isEditingThread.value = false; },
  });
};

// Edit post
const startEditPost = (post: PostDetail) => {
  editingPostId.value = post.id;
  editPostContent.value = post.content;
};

const cancelEditPost = () => { editingPostId.value = null; };

const saveEditPost = () => {
  if (!editingPostId.value) return;
  updatePostMutate({ id: editingPostId.value, data: { content: editPostContent.value } }, {
    onSuccess: () => { editingPostId.value = null; },
  });
};

// Delete
const showDeleteConfirm = (type: 'thread' | 'post', id: string) => {
  confirmDeleteType.value = type;
  confirmDeleteId.value = id;
};

const cancelDelete = () => { confirmDeleteType.value = null; confirmDeleteId.value = null; };

const confirmDelete = () => {
  if (!confirmDeleteId.value || !confirmDeleteType.value) return;
  if (confirmDeleteType.value === 'thread') {
    const targetForumId = thread.value?.forum.id;
    deleteThreadMutate(confirmDeleteId.value, {
      onSuccess: () => {
        router.push(targetForumId ? `/forum/${targetForumId}` : '/');
      },
      onSettled: () => cancelDelete(),
    });
  } else {
    deletePostMutate(confirmDeleteId.value, {
      onSettled: () => cancelDelete(),
    });
  }
};

// Like thread
const toggleThreadLike = () => {
  if (!authStore.isAuthenticated || !thread.value || isLikingThread.value) return;
  toggleThreadLikeMutate(thread.value.id);
};

// Like post
const togglePostLike = (post: PostDetail) => {
  if (!authStore.isAuthenticated || likingPostIds.has(post.id)) return;
  likingPostIds.add(post.id);
  togglePostLikeMutate(post.id, {
    onSettled: () => { likingPostIds.delete(post.id); },
  });
};

// Admin: Pin/Lock
const togglePin = () => {
  if (!thread.value || isPinning.value) return;
  pinThreadMutate(thread.value.id);
};

const toggleLock = () => {
  if (!thread.value || isLocking.value) return;
  lockThreadMutate(thread.value.id);
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <main class="flex items-center w-screen flex-col min-h-screen py-8 sm:px-6 lg:px-8 pt-24">
    <div v-if="isLoading" class="w-full sm:mx-auto sm:max-w-4xl space-y-4">
      <div class="glass rounded-xl p-6 animate-pulse">
        <div class="h-6 bg-(--color-background-mute) rounded w-2/3 mb-4"></div>
        <div class="h-4 bg-(--color-background-mute) rounded w-1/4 mb-6"></div>
        <div class="h-20 bg-(--color-background-mute) rounded"></div>
      </div>
    </div>

    <div v-else-if="error && !thread" class="text-center py-12">
      <div class="bg-red-500/10 text-(--color-error) rounded-xl p-6 border border-red-500/20 max-w-md mx-auto">
        <p class="font-medium">{{ error }}</p>
        <router-link to="/forums" class="text-sky-600 dark:text-sky-400 hover:underline text-sm mt-2 inline-block">← Back to Home</router-link>
      </div>
    </div>

    <div v-else-if="thread" class="w-full sm:mx-auto sm:max-w-4xl space-y-6">

      <!-- Breadcrumbs -->
      <nav class="text-sm text-(--color-text-muted) mb-4 flex items-center gap-1 flex-wrap">
        <router-link to="/forums" class="hover:text-sky-600 dark:hover:text-sky-400">Forums</router-link>
        <span>›</span>
        <router-link :to="`/forum/${thread.forum.id}`" class="hover:text-sky-600 dark:hover:text-sky-400">{{ thread.forum.name
        }}</router-link>
        <span>›</span>
        <span class="text-(--color-heading) font-medium truncate max-w-[240px]">{{ thread.title }}</span>
        <!-- Badges -->
        <span v-if="thread.isPinned"
          class="ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">📌
          Pinned</span>
        <span v-if="thread.isLocked"
          class="ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-700 dark:text-red-300">🔒
          Locked</span>
      </nav>

      <!-- Main Thread Post -->
      <div class="flex flex-col sm:flex-row gap-4 items-start">
        <div class="w-full sm:w-52 sm:flex-shrink-0">
          <ProfileCard :author="thread.author" />
        </div>
        <div class="flex-1 min-w-0 w-full glass sm:rounded-xl overflow-hidden">
        <div class="p-6 border-b border-(--color-border) bg-(--color-background-soft)">
          <!-- View Mode -->
          <template v-if="!isEditingThread">
            <h1 class="text-2xl font-bold text-(--color-heading) mb-2">{{ thread.title }}</h1>
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center text-sm text-(--color-text-muted) gap-3">
                <span class="font-medium text-sky-600 dark:text-sky-400">@{{ thread.author.name }}</span>
                <span>•</span>
                <span>{{ formatDate(thread.createdAt) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Like thread button -->
                <button v-if="authStore.isAuthenticated" @click="toggleThreadLike" :disabled="isLikingThread" :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  thread.isLikedByMe
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25'
                    : 'bg-(--color-background-mute) text-(--color-text-muted) hover:bg-(--color-border)'
                ]">
                  <span>{{ thread.isLikedByMe ? '👍' : '👍' }}</span>
                  <span>{{ thread.likeCount }}</span>
                </button>
                <!-- Admin controls -->
                <template v-if="isAdmin">
                  <button @click="togglePin" :disabled="isPinning"
                    class="text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors">
                    {{ thread.isPinned ? '📌 Unpin' : '📌 Pin' }}
                  </button>
                  <button @click="toggleLock" :disabled="isLocking"
                    class="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/10 transition-colors">
                    {{ thread.isLocked ? '🔓 Unlock' : '🔒 Lock' }}
                  </button>
                </template>
                <!-- Owner/Admin edit/delete -->
                <template v-if="isThreadOwnerOrAdmin">
                  <button @click="startEditThread"
                    class="text-sm text-(--color-text-muted) hover:text-sky-600 dark:hover:text-sky-400 transition-colors px-2 py-1">Edit</button>
                  <button @click="showDeleteConfirm('thread', thread.id)"
                    class="text-sm text-(--color-text-muted) hover:text-(--color-error) transition-colors px-2 py-1">Delete</button>
                </template>
                <ShareButton :url="threadShareUrl(thread.id)" :title="thread.title" />
                <ReportButton v-if="!isThreadOwnerOrAdmin" target-type="thread" :target-id="thread.id" />
              </div>
            </div>
          </template>
          <!-- Edit Mode -->
          <template v-else>
            <div v-if="editThreadError" class="p-3 bg-red-500/10 text-(--color-error) border border-red-500/20 rounded-md text-sm mb-3">{{ editThreadError }}
            </div>
            <input v-model="editThreadTitle"
              class="w-full text-2xl font-bold text-(--color-heading) mb-3 px-3 py-2 border border-(--color-border) bg-(--color-background) rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
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
                class="px-4 py-2 text-sm text-(--color-text-muted) border border-(--color-border) rounded-md hover:bg-(--color-background-mute)">Cancel</button>
              <button @click="saveEditThread" :disabled="isSavingThread"
                class="px-4 py-2 text-sm text-white bg-indigo-700 hover:bg-indigo-600 rounded-md disabled:opacity-50">
                {{ isSavingThread ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </template>
        </div>
        </div>
      </div>

      <!-- Error banner -->
      <div v-if="error && thread" class="p-3 bg-red-500/10 text-(--color-error) border border-red-500/20 rounded-md text-sm">{{ error }}</div>

      <!-- Replies list -->
      <div class="space-y-4 pb-5">
        <h3 class="text-lg font-semibold text-(--color-heading) pl-2">Replies ({{ total }})</h3>

        <div v-if="posts.length === 0"
          class="glass sm:rounded-xl p-8 text-center text-(--color-text-muted)">
          <p>No replies yet. Be the first to respond!</p>
        </div>

        <div v-for="post in posts" :key="post.id" :id="'post-' + post.id" class="flex flex-col sm:flex-row gap-4 pb-4 items-start">
          <div class="w-full sm:w-52 sm:flex-shrink-0">
            <ProfileCard :author="post.author" />
          </div>
          <div class="flex-1 min-w-0 w-full glass sm:rounded-xl overflow-hidden">
          <div class="px-6 py-3 border-b border-(--color-border) bg-(--color-background-soft) flex justify-between items-center text-sm">
            <span class="font-medium text-sky-600 dark:text-sky-400">@{{ post.author.name }}</span>
            <div class="flex items-center gap-3">
              <span class="text-(--color-text-muted)">{{ formatDate(post.createdAt) }}</span>
              <!-- Like post button -->
              <button v-if="authStore.isAuthenticated && editingPostId !== post.id" @click="togglePostLike(post)"
                :disabled="isPostLiking(post.id)" :class="[
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
                  post.isLikedByMe
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                    : 'text-(--color-text-muted) hover:text-sky-700 dark:hover:text-sky-300 hover:bg-(--color-background-mute)'
                ]">
                👍 {{ post.likeCount || 0 }}
              </button>
              <span v-else-if="!authStore.isAuthenticated && (post.likeCount ?? 0) > 0" class="text-(--color-text-muted) text-xs">
                👍 {{ post.likeCount }}
              </span>
              <!-- Edit/Delete -->
              <template v-if="isPostOwnerOrAdmin(post) && editingPostId !== post.id">
                <button @click="startEditPost(post)"
                  class="text-(--color-text-muted) hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Edit</button>
                <button @click="showDeleteConfirm('post', post.id)"
                  class="text-(--color-text-muted) hover:text-(--color-error) transition-colors">Delete</button>
              </template>
              <ShareButton :url="postShareUrl(props.id, post.id)" :title="thread?.title" />
              <ReportButton v-if="!isPostOwnerOrAdmin(post) && editingPostId !== post.id" target-type="post" :target-id="post.id" />
            </div>
          </div>
          <!-- Post View Mode -->
          <div v-if="editingPostId !== post.id" class="p-6">
            <MarkdownRenderer :content="post.content" />
          </div>
          <!-- Post Edit Mode -->
          <div v-else class="p-6">
            <div v-if="editPostError" class="p-3 bg-red-500/10 text-(--color-error) border border-red-500/20 rounded-md text-sm mb-3">{{ editPostError }}
            </div>
            <MarkdownEditor v-model="editPostContent" :rows="4" />
            <div class="flex gap-2 mt-3 justify-end">
              <button @click="cancelEditPost"
                class="px-4 py-2 text-sm text-(--color-text-muted) border border-(--color-border) rounded-md hover:bg-(--color-background-mute)">Cancel</button>
              <button @click="saveEditPost" :disabled="isSavingPost"
                class="px-4 py-2 text-sm text-white bg-indigo-700 hover:bg-indigo-600 rounded-md disabled:opacity-50">
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
          class="px-3 py-2 text-sm rounded-lg border border-(--color-border) hover:bg-(--color-background-mute) disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          ← Prev
        </button>
        <span class="text-sm text-(--color-text-muted) px-2">Page {{ currentPage }} / {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages"
          class="px-3 py-2 text-sm rounded-lg border border-(--color-border) hover:bg-(--color-background-mute) disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next →
        </button>
      </div>

      <!-- Reply Box -->
      <div v-if="authStore.isAuthenticated && !thread.isLocked"
        class="glass sm:rounded-xl p-6 mt-8">
        <h3 class="text-lg font-medium text-(--color-heading) mb-4">Post a Reply</h3>
        <form @submit.prevent="submitReply">
          <div v-if="replyError" class="p-3 bg-red-500/10 text-(--color-error) border border-red-500/20 rounded-md text-sm mb-3">{{ replyError }}</div>
          <MarkdownEditor v-model="replyContent" placeholder="Write your reply here... Markdown is supported."
            :rows="5" />
          <div class="mt-4 flex justify-end">
            <button type="submit" :disabled="isReplying || !replyContent.trim()"
              class="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {{ isReplying ? 'Posting...' : 'Reply' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Locked notice -->
      <div v-else-if="thread.isLocked" class="bg-amber-500/10 border border-amber-500/25 rounded-xl p-5 text-center mt-8">
        <p class="text-amber-700 dark:text-amber-300 font-medium">🔒 This thread has been locked. No new replies can be posted.</p>
      </div>

      <!-- Not logged in -->
      <div v-else class="glass rounded-xl p-6 text-center mt-8">
        <p class="text-(--color-text-muted) mb-4">You must be logged in to reply to this thread.</p>
        <router-link to="/login"
          class="inline-block py-2 px-6 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-600">
          Sign In to Reply
        </router-link>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="confirmDeleteType"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-(--color-background) border border-(--color-border) rounded-xl p-6 max-w-sm mx-4 shadow-xl">
          <h3 class="text-lg font-bold text-(--color-heading) mb-2">Confirm Delete</h3>
          <p class="text-(--color-text-muted) mb-6">Are you sure you want to delete this {{ confirmDeleteType }}? This action cannot
            be
            undone.</p>
          <div class="flex gap-3 justify-end">
            <button @click="cancelDelete"
              class="px-4 py-2 text-sm text-(--color-text-muted) border border-(--color-border) rounded-md hover:bg-(--color-background-mute)">Cancel</button>
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

<style scoped>
.post-highlight {
  animation: post-flash 2s ease-out;
  border-radius: 0.75rem;
}
@keyframes post-flash {
  0% { background-color: rgba(56, 189, 248, 0.25); }
  100% { background-color: transparent; }
}
</style>
