<script setup lang="ts">
import { ref } from 'vue';
import { forumsApi } from '../api/index.js';
import { useRouter } from 'vue-router';

const router = useRouter();
const name = ref('');
const description = ref('');
const error = ref('');
const isLoading = ref(false);

const handleCreate = async () => {
    isLoading.value = true;
    error.value = '';
    try {
        await forumsApi.createForum({ name: name.value, description: description.value });
        router.push('/');
    } catch (err: any) {
        error.value = err.message || 'Failed to create forum';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <main class="min-h-screen bg-gray-50 flex flex-col py-12 sm:px-6 lg:px-8 pt-24">
        <div class="sm:mx-auto sm:w-full sm:max-w-xl">
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create New Forum</h2>
            <p class="mt-2 text-center text-sm text-gray-600">
                Start a new discussion category.
            </p>
        </div>

        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
            <div class="bg-white py-8 px-4 shadow-sm sm:rounded-xl border border-gray-100 sm:px-10">
                <form class="space-y-6" @submit.prevent="handleCreate">
                    <div v-if="error" class="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                        {{ error }}
                    </div>
                    
                    <div>
                        <label for="name" class="block text-sm font-medium text-gray-700"> Forum Name </label>
                        <div class="mt-1">
                            <input id="name" name="name" type="text" required v-model="name" placeholder="e.g. Frontend Development"
                                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="description" class="block text-sm font-medium text-gray-700"> Description (Optional) </label>
                        <div class="mt-1">
                            <textarea id="description" name="description" rows="3" v-model="description" placeholder="What is this forum about?"
                                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <button type="button" @click="router.back()"
                            class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Cancel
                        </button>
                        <button type="submit" :disabled="isLoading"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {{ isLoading ? 'Creating...' : 'Create Forum' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </main>
</template>
