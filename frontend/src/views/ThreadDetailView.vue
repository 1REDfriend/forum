<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { threadsApi, postsApi } from '../api/index.js';
import type { ThreadDetail, PostDetail } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';

const props = defineProps<{
    id: string
}>();

const authStore = useAuthStore();
const thread = ref<ThreadDetail | null>(null);
const posts = ref<PostDetail[]>([]);
const error = ref('');
const isLoading = ref(true);

const replyContent = ref('');
const isReplying = ref(false);

const loadData = async () => {
    isLoading.value = true;
    error.value = '';
    try {
        const threadId = Number(props.id);
        thread.value = await threadsApi.getThreadById(threadId);
        posts.value = await postsApi.getPostsByThreadId(threadId);
    } catch (err: any) {
        error.value = err.message || "Failed to load thread";
    } finally {
        isLoading.value = false;
    }
};

onMounted(loadData);

const submitReply = async () => {
    if (!replyContent.value.trim()) return;
    
    isReplying.value = true;
    try {
        await postsApi.createPost({
            content: replyContent.value,
            threadId: Number(props.id)
        });
        replyContent.value = '';
        await loadData(); // Reload posts
    } catch (err: any) {
        alert(err.message || "Failed to post reply");
    } finally {
        isReplying.value = false;
    }
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('th-TH', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
};
</script>

<template>
    <main class="min-h-screen bg-gray-50 flex flex-col py-8 sm:px-6 lg:px-8 pt-24">
        <div v-if="isLoading" class="text-center py-12 text-gray-500">
            Loading...
        </div>
        
        <div v-else-if="error" class="text-center py-12 text-red-500">
            {{ error }}
        </div>

        <div v-else-if="thread" class="sm:mx-auto sm:w-full sm:max-w-4xl space-y-6">
            
            <!-- Breadcrumbs -->
            <nav class="text-sm text-gray-500 mb-4">
                <router-link to="/" class="hover:text-indigo-600">Home</router-link> &rsaquo; 
                <router-link :to="`/forum/${thread.forum.id}`" class="hover:text-indigo-600">{{ thread.forum.name }}</router-link> &rsaquo; 
                <span class="text-gray-800 font-medium truncate inline-block max-w-[200px] align-bottom">{{ thread.title }}</span>
            </nav>

            <!-- Main Thread Post -->
            <div class="bg-white shadow-sm sm:rounded-xl border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ thread.title }}</h1>
                    <div class="flex items-center text-sm text-gray-500 gap-3">
                        <span class="font-medium text-indigo-600">@{{ thread.author.name }}</span>
                        <span>•</span>
                        <span>{{ formatDate(thread.createdAt) }}</span>
                    </div>
                </div>
                <div class="p-6 text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {{ thread.content }}
                </div>
            </div>

            <!-- Replies list -->
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-700 pl-2">Replies ({{ posts.length }})</h3>
                
                <div v-for="post in posts" :key="post.id" class="bg-white shadow-sm sm:rounded-xl border border-gray-100 overflow-hidden">
                    <div class="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center text-sm">
                        <span class="font-medium text-indigo-600">@{{ post.author.name }}</span>
                        <span class="text-gray-400">{{ formatDate(post.createdAt) }}</span>
                    </div>
                    <div class="p-6 text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {{ post.content }}
                    </div>
                </div>
            </div>

            <!-- Reply Box -->
            <div v-if="authStore.isAuthenticated" class="bg-white shadow-sm sm:rounded-xl border border-gray-100 p-6 mt-8">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Post a Reply</h3>
                <form @submit.prevent="submitReply">
                    <textarea v-model="replyContent" rows="4" required placeholder="Write your reply here..."
                        class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                    <div class="mt-4 flex justify-end">
                        <button type="submit" :disabled="isReplying || !replyContent.trim()"
                            class="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {{ isReplying ? 'Posting...' : 'Reply' }}
                        </button>
                    </div>
                </form>
            </div>
            <div v-else class="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center mt-8">
                <p class="text-gray-600 mb-4">You must be logged in to reply to this thread.</p>
                <router-link to="/login" class="inline-block py-2 px-6 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                    Sign In to Reply
                </router-link>
            </div>

        </div>
    </main>
</template>
