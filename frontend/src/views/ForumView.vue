<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { threadsApi, forumsApi } from '../api/index.js';
import type { ThreadDetail, Forum } from '../api/types.js';
import Navbar from '@/components/Navbar.vue';
import { useAuthStore } from '../stores/auth.js';

const props = defineProps<{
    forum: string
}>();

const authStore = useAuthStore();
const threads = ref<ThreadDetail[]>([]);
const forumData = ref<Forum | null>(null);
const isLoading = ref(true);
const error = ref('');

onMounted(async () => {
    try {
        const forumId = Number(props.forum);
        forumData.value = await forumsApi.getForumById(forumId);
        const allThreads = await threadsApi.getAllThreads();
        threads.value = allThreads.filter(t => t.forum.id === forumId);
    } catch (err: any) {
        error.value = err.message || "Failed to load threads";
    } finally {
        isLoading.value = false;
    }
});

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('th-TH', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
};
</script>

<template>
    <main class="min-h-screen bg-gray-50 pb-12">
        <Navbar />
        <div class="flex flex-col max-w-5xl mx-auto pt-24 px-4 sm:px-6">
            
            <nav class="text-sm text-gray-500 mb-4">
                <router-link to="/" class="hover:text-indigo-600">Home</router-link> &rsaquo; 
                <span class="text-gray-800 font-medium" v-if="forumData">{{ forumData.name }}</span>
            </nav>

            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-extrabold text-gray-900" v-if="forumData">{{ forumData.name }}</h1>
                <h1 class="text-2xl font-extrabold text-gray-900" v-else>Loading...</h1>

                <router-link v-if="authStore.isAuthenticated && forumData" :to="`/forum/${forumData.id}/create-thread`" 
                    class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-sm text-sm font-medium transition-colors">
                    + New Thread
                </router-link>
            </div>

            <p class="text-gray-600 mb-8" v-if="forumData && forumData.description">{{ forumData.description }}</p>

            <div v-if="isLoading" class="text-center py-12 text-gray-500">Loading threads...</div>
            <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>
            
            <div v-else class="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                <div class="flex h-12 w-full bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-semibold text-gray-500 select-none">
                    <div class="flex flex-1 px-6 items-center border-r border-gray-100">
                        Topic
                    </div>
                    <div class="hidden sm:flex w-48 pl-4 items-center border-r border-gray-100">
                        Author
                    </div>
                    <div class="hidden sm:flex w-32 justify-center items-center">
                        Created
                    </div>
                </div>

                <div v-if="threads.length === 0" class="p-8 text-center text-gray-500">
                    No threads found in this forum. Be the first to start a discussion!
                </div>

                <router-link v-for="thread in threads" :key="thread.id" :to="`/thread/${thread.id}`"
                    class="flex hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group cursor-pointer">
                    <div class="flex flex-col flex-1 px-6 py-4 border-r border-gray-50 justify-center">
                        <h3 class="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-lg">
                            {{ thread.title }}
                        </h3>
                    </div>
                    <div class="hidden sm:flex flex-col w-48 pl-4 justify-center text-sm text-gray-600 border-r border-gray-50">
                        @{{ thread.author.name }}
                    </div>
                    <div class="hidden sm:flex flex-col w-32 justify-center items-center text-xs text-gray-400">
                        {{ formatDate(thread.createdAt) }}
                    </div>
                </router-link>
            </div>
        </div>
    </main>
</template>