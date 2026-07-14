<script setup lang="ts">
import { ref, watch } from 'vue';
import { searchApi } from '../api/index.js';
import type { SearchResponse } from '../api/types.js';
import { useRoute } from 'vue-router';

const route = useRoute();
const query = ref((route.query.q as string) || '');
const results = ref<SearchResponse | null>(null);
const isLoading = ref(false);
const error = ref('');
let debounceTimer: ReturnType<typeof setTimeout>;

const doSearch = async () => {
    const q = query.value.trim();
    if (!q) {
        results.value = null;
        return;
    }

    isLoading.value = true;
    error.value = '';
    try {
        results.value = await searchApi.search(q);
    } catch (err: any) {
        error.value = err.message || 'Search failed';
    } finally {
        isLoading.value = false;
    }
};

watch(query, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 300);
});

// Search on mount if query param exists
if (query.value) {
    doSearch();
}

const totalResults = () => {
    if (!results.value) return 0;
    return results.value.forums.length + results.value.threads.length;
};
</script>

<template>
    <main class="flex justify-center min-h-screen pt-24 pb-12">
        <div class="max-w-3xl w-7/8 mx-auto px-4 sm:px-6">
            <h1 class="text-2xl font-extrabold text-(--color-heading) mb-6">Search</h1>

            <!-- Search Input -->
            <div class="relative mb-8">
                <svg xmlns="http://www.w3.org/2000/svg"
                    class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-(--color-text-muted)" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input v-model="query" type="text" placeholder="Search forums and threads..."
                    class="w-full pl-12 pr-4 py-3 border border-(--color-border) rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-(--color-heading) placeholder-(--color-text-muted) bg-(--color-background)"
                    autofocus />
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="text-center py-8 text-(--color-text-muted)">
                <div
                    class="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin">
                </div>
                <p class="mt-2 text-sm">Searching...</p>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="bg-red-500/10 text-(--color-error) rounded-xl p-4 border border-red-500/20 text-sm">
                {{ error }}
            </div>

            <!-- Results -->
            <template v-else-if="results && query.trim()">
                <p class="text-sm text-(--color-text-muted) mb-6">{{ totalResults() }} results found</p>

                <!-- Forum Results -->
                <div v-if="results.forums.length > 0" class="mb-8">
                    <h2 class="text-sm font-semibold text-(--color-text-muted) uppercase tracking-wider mb-3">Forums</h2>
                    <div class="space-y-2">
                        <router-link v-for="forum in results.forums" :key="forum.id" :to="`/forum/${forum.id}`"
                            class="block bg-(--color-background-soft) rounded-xl border border-(--color-border) px-5 py-4 hover:bg-(--color-background-mute) transition-colors group">
                            <h3 class="font-bold text-(--color-heading) group-hover:!text-sky-600 dark:group-hover:!text-sky-400 transition-colors">{{
                                forum.name }}</h3>
                            <p class="text-sm text-(--color-text-muted) mt-1" v-if="forum.description">{{ forum.description }}</p>
                        </router-link>
                    </div>
                </div>

                <!-- Thread Results -->
                <div v-if="results.threads.length > 0">
                    <h2 class="text-sm font-semibold text-(--color-text-muted) uppercase tracking-wider mb-3">Threads</h2>
                    <div class="space-y-2">
                        <router-link v-for="thread in results.threads" :key="thread.id" :to="`/thread/${thread.id}`"
                            class="block bg-(--color-background-soft) rounded-xl border border-(--color-border) px-5 py-4 hover:bg-(--color-background-mute) transition-colors group">
                            <h3 class="font-bold text-(--color-heading) group-hover:!text-sky-600 dark:group-hover:!text-sky-400 transition-colors">{{
                                thread.title }}</h3>
                            <div class="flex gap-3 text-xs text-(--color-text-muted) mt-1">
                                <span>in {{ thread.forumName }}</span>
                                <span>by @{{ thread.authorName }}</span>
                            </div>
                            <p class="text-sm text-(--color-text-muted) mt-2 line-clamp-2">{{ thread.content }}</p>
                        </router-link>
                    </div>
                </div>

                <!-- No Results -->
                <div v-if="totalResults() === 0" class="text-center py-12 text-(--color-text-muted)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 text-(--color-text-muted)" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p class="font-medium">No results found</p>
                    <p class="text-sm mt-1">Try a different search term</p>
                </div>
            </template>

            <!-- Empty State -->
            <div v-else-if="!query.trim()" class="text-center py-12 text-(--color-text-muted)">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-(--color-text-muted)" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p class="text-lg font-medium text-(--color-text-muted)">Start typing to search</p>
                <p class="text-sm mt-1">Search across forums and threads</p>
            </div>
        </div>
    </main>
</template>
