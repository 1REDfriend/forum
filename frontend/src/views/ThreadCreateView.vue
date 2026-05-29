<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { threadsApi, forumsApi } from '../api/index.js';
import type { Forum } from '../api/types.js';
import { useRouter } from 'vue-router';
import MarkdownEditor from '../components/MarkdownEditor.vue';

const props = defineProps<{
    forum: string // This is the forum ID from route
}>();

const router = useRouter();
const title = ref('');
const content = ref('');
const error = ref('');
const isLoading = ref(false);
const forumData = ref<Forum | null>(null);

onMounted(async () => {
    try {
        forumData.value = await forumsApi.getForumById(Number(props.forum));
    } catch (err) {
        error.value = "Failed to load forum info";
    }
});

const handleCreate = async () => {
    isLoading.value = true;
    error.value = '';
    try {
        const newThread = await threadsApi.createThread({ 
            title: title.value, 
            content: content.value,
            forumId: Number(props.forum)
        });
        router.push(`/thread/${newThread.id}`);
    } catch (err: any) {
        error.value = err.message || 'Failed to create thread';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <main class="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 pt-24">
        <div class="w-full max-w-3xl">
            <h2 class="mt-6 text-2xl font-extrabold text-gray-900">Create New Thread</h2>
            <p class="mt-2 text-sm text-gray-600" v-if="forumData">
                Posting in <strong>{{ forumData.name }}</strong>
            </p>
        </div>

        <div class="mt-6 w-full max-w-3xl">
            <div class="bg-white py-8 px-4 shadow-sm sm:rounded-xl border border-gray-100 sm:px-10">
                <form class="space-y-6" @submit.prevent="handleCreate">
                    <div v-if="error" class="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                        {{ error }}
                    </div>
                    
                    <div>
                        <label for="title" class="block text-sm font-medium text-gray-700"> Title </label>
                        <div class="mt-1">
                            <input id="title" name="title" type="text" required v-model="title" placeholder="Keep it clear and concise"
                                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="content" class="block text-sm font-medium text-gray-700 mb-1">Content</label>
                        <MarkdownEditor v-model="content" placeholder="Share your thoughts, ask questions... Markdown is supported." :rows="10" />
                    </div>

                    <div class="flex gap-4 justify-end">
                        <button type="button" @click="router.back()"
                            class="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Cancel
                        </button>
                        <button type="submit" :disabled="isLoading || !forumData"
                            class="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {{ isLoading ? 'Posting...' : 'Post Thread' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </main>
</template>
