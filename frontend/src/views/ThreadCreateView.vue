<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import MarkdownEditor from '../components/MarkdownEditor.vue';
import { useForum } from '../composables/useForums.js';
import { useCreateThread } from '../composables/useThreads.js';

const props = defineProps<{
    forum: string // This is the forum ID from route
}>();

const router = useRouter();
const title = ref('');
const content = ref('');

const { data: forumData, error: forumQueryError } = useForum(computed(() => props.forum));
const { mutate: createThreadMutate, isPending: isLoading, error: createThreadError } = useCreateThread();

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : undefined);
const error = computed(() => {
    if (createThreadError.value) return errorMessage(createThreadError.value) ?? 'Failed to create thread';
    if (forumQueryError.value) return 'Failed to load forum info';
    return '';
});

const handleCreate = () => {
    createThreadMutate(
        { title: title.value, content: content.value, forumId: props.forum },
        {
            onSuccess: (newThread) => {
                router.push(`/thread/${newThread.id}`);
            },
        },
    );
};
</script>

<template>
    <main class="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 pt-24">
        <div class="w-full max-w-3xl">
            <h2 class="mt-6 text-2xl font-extrabold text-(--color-heading)">Create New Thread</h2>
            <p class="mt-2 text-sm text-(--color-text-muted)" v-if="forumData">
                Posting in <strong>{{ forumData.name }}</strong>
            </p>
        </div>

        <div class="mt-6 w-full max-w-3xl">
            <div class="glass py-8 px-4 sm:rounded-xl sm:px-10">
                <form class="space-y-6" @submit.prevent="handleCreate">
                    <div v-if="error" class="p-3 bg-red-500/10 text-(--color-error) border border-red-500/20 rounded-md text-sm">
                        {{ error }}
                    </div>

                    <div>
                        <label for="title" class="block text-sm font-medium text-(--color-heading)"> Title </label>
                        <div class="mt-1">
                            <input id="title" name="title" type="text" required v-model="title" placeholder="Keep it clear and concise"
                                class="appearance-none block w-full px-3 py-2 border border-(--color-border) bg-(--color-background) text-(--color-heading) rounded-md shadow-sm placeholder-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="content" class="block text-sm font-medium text-(--color-heading) mb-1">Content</label>
                        <MarkdownEditor v-model="content" placeholder="Share your thoughts, ask questions... Markdown is supported." :rows="10" />
                    </div>

                    <div class="flex gap-4 justify-end">
                        <button type="button" @click="router.back()"
                            class="py-2 px-4 border border-(--color-border) rounded-md shadow-sm text-sm font-medium text-(--color-heading) bg-(--color-background) hover:bg-(--color-background-mute) focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Cancel
                        </button>
                        <button type="submit" :disabled="isLoading || !forumData"
                            class="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {{ isLoading ? 'Posting...' : 'Post Thread' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </main>
</template>
