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
        forumData.value = await forumsApi.getForumById(props.forum);
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
            forumId: props.forum
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
    <main class="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 pt-24">
        <div class="w-full max-w-3xl">
            <h2 class="mt-6 text-2xl font-extrabold text-slate-100">Create New Thread</h2>
            <p class="mt-2 text-sm text-slate-400" v-if="forumData">
                Posting in <strong>{{ forumData.name }}</strong>
            </p>
        </div>

        <div class="mt-6 w-full max-w-3xl">
            <div class="bg-white/5 backdrop-blur-xl py-8 px-4 shadow-xl sm:rounded-xl border border-white/10 sm:px-10">
                <form class="space-y-6" @submit.prevent="handleCreate">
                    <div v-if="error" class="p-3 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md text-sm">
                        {{ error }}
                    </div>
                    
                    <div>
                        <label for="title" class="block text-sm font-medium text-slate-300"> Title </label>
                        <div class="mt-1">
                            <input id="title" name="title" type="text" required v-model="title" placeholder="Keep it clear and concise"
                                class="appearance-none block w-full px-3 py-2 border border-white/15 bg-white/5 text-slate-100 rounded-md shadow-sm placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="content" class="block text-sm font-medium text-slate-300 mb-1">Content</label>
                        <MarkdownEditor v-model="content" placeholder="Share your thoughts, ask questions... Markdown is supported." :rows="10" />
                    </div>

                    <div class="flex gap-4 justify-end">
                        <button type="button" @click="router.back()"
                            class="py-2 px-4 border border-white/15 rounded-md shadow-sm text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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
