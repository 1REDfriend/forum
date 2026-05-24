<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { forumsApi } from '../api/index.js';
import type { Forum } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';

const forums = ref<Forum[]>([]);
const isLoading = ref(true);
const authStore = useAuthStore();

onMounted(async () => {
    try {
        forums.value = await forumsApi.getAllForums();
    } catch (err) {
        console.error("Failed to load forums", err);
    } finally {
        isLoading.value = false;
    }
});

// Mock helper to generate realistic looking stats for UI completeness
const getMockStats = (forumId: number) => {
    return {
        threads: Math.floor(Math.random() * 50) + 10,
        posts: Math.floor(Math.random() * 500) + 50,
        lastPostBy: ['john_doe', 'admin', 'vue_master'][Math.floor(Math.random() * 3)],
        lastPostTime: Math.floor(Math.random() * 59) + 1
    };
};
</script>

<template>
    <div class="flex flex-col max-w-5xl mx-auto pt-24 px-4 sm:px-6">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-extrabold text-gray-900">Discussion Forums</h1>
            <router-link v-if="authStore.isAuthenticated" to="/forum/create" 
                class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-sm text-sm font-medium transition-colors">
                + Create Forum
            </router-link>
        </div>

        <div v-if="isLoading" class="text-center py-12 text-gray-500">Loading forums...</div>
        
        <div v-else class="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
            <div class="flex h-12 w-full bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-semibold text-gray-500 select-none">
                <div class="flex flex-1 px-6 items-center border-r border-gray-100">
                    Forum
                </div>
                <div class="hidden md:flex w-64 pl-4 items-center border-r border-gray-100">
                    Last Post
                </div>
                <div class="hidden sm:flex w-24 justify-center items-center border-r border-gray-100">
                    Threads
                </div>
                <div class="hidden sm:flex w-24 justify-center items-center">
                    Posts
                </div>
            </div>

            <div v-if="forums.length === 0" class="p-8 text-center text-gray-500">
                No forums found. Be the first to create one!
            </div>

            <router-link v-for="forum in forums" :key="forum.id" :to="`/forum/${forum.id}`"
                class="flex hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group cursor-pointer">
                
                <div class="flex flex-col flex-1 px-6 py-5 border-r border-gray-50">
                    <h3 class="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-lg">
                        {{ forum.name }}
                    </h3>
                    <p class="text-sm text-gray-500 mt-1" v-if="forum.description">{{ forum.description }}</p>
                </div>
                
                <!-- Mock Last Post -->
                <div class="hidden md:flex flex-col w-64 px-4 justify-center border-r border-gray-50 text-sm">
                    <span class="text-gray-700 truncate font-medium hover:underline cursor-pointer">Re: {{ forum.name }} Discussion</span>
                    <div class="flex justify-between mt-1 text-xs text-gray-500">
                        <span>by @{{ getMockStats(forum.id).lastPostBy }}</span>
                        <span>{{ getMockStats(forum.id).lastPostTime }} mins ago</span>
                    </div>
                </div>

                <!-- Mock Stats -->
                <div class="hidden sm:flex flex-col w-24 justify-center items-center text-gray-600 border-r border-gray-50 font-medium">
                    {{ getMockStats(forum.id).threads }}
                </div>
                <div class="hidden sm:flex flex-col w-24 justify-center items-center text-gray-600 font-medium">
                    {{ getMockStats(forum.id).posts }}
                </div>
            </router-link>
        </div>
    </div>
</template>