<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCreateForum } from '../composables/useForums.js';

const router = useRouter();
const name = ref('');
const description = ref('');

const { mutate: createForumMutate, isPending: isLoading, error: createForumError } = useCreateForum();

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : undefined);
const error = computed(() => errorMessage(createForumError.value) ?? '');

const handleCreate = () => {
    createForumMutate(
        { name: name.value, description: description.value },
        {
            onSuccess: () => {
                router.push('/');
            },
        },
    );
};
</script>

<template>
    <main class="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 pt-24">
        <div class="w-full max-w-xl">
            <h2 class="mt-6 text-center text-3xl font-extrabold text-(--color-heading)">Create New Forum</h2>
            <p class="mt-2 text-center text-sm text-(--color-text-muted)">
                Start a new discussion category.
            </p>
        </div>

        <div class="mt-8 w-full max-w-xl">
            <div class="glass py-8 px-4 sm:rounded-xl sm:px-10">
                <form class="space-y-6" @submit.prevent="handleCreate">
                    <div v-if="error" class="p-3 bg-red-500/10 text-(--color-error) border border-red-500/20 rounded-md text-sm">
                        {{ error }}
                    </div>

                    <div>
                        <label for="name" class="block text-sm font-medium text-(--color-heading)"> Forum Name </label>
                        <div class="mt-1">
                            <input id="name" name="name" type="text" required v-model="name" placeholder="e.g. Frontend Development"
                                class="appearance-none block w-full px-3 py-2 border border-(--color-border) bg-(--color-background) text-(--color-heading) rounded-md shadow-sm placeholder-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="description" class="block text-sm font-medium text-(--color-heading)"> Description (Optional) </label>
                        <div class="mt-1">
                            <textarea id="description" name="description" rows="3" v-model="description" placeholder="What is this forum about?"
                                class="appearance-none block w-full px-3 py-2 border border-(--color-border) bg-(--color-background) text-(--color-heading) rounded-md shadow-sm placeholder-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <button type="button" @click="router.back()"
                            class="w-full flex justify-center py-2 px-4 border border-(--color-border) rounded-md shadow-sm text-sm font-medium text-(--color-heading) bg-(--color-background) hover:bg-(--color-background-mute) focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Cancel
                        </button>
                        <button type="submit" :disabled="isLoading"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {{ isLoading ? 'Creating...' : 'Create Forum' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </main>
</template>
