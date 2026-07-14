<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

const handleRegister = async () => {
    isLoading.value = true;
    error.value = '';
    try {
        await authStore.register({ name: name.value, email: email.value, password: password.value });
        router.push('/');
    } catch (err: any) {
        error.value = err.message || 'Registration failed';
    } finally {
        isLoading.value = false;
    }
};

const handleGoogleCallback = async (response: any) => {
    if (!response.credential) return;

    isLoading.value = true;
    error.value = '';
    try {
        await authStore.googleAuth(response.credential);
        router.push('/');
    } catch (err: any) {
        error.value = err.message || 'Google Registration failed';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <main class="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pt-24">
        <div class="w-full max-w-md">
            <h2 class="mt-6 text-center text-3xl font-extrabold text-(--color-heading)">Create a new account</h2>
            <p class="mt-2 text-center text-sm text-(--color-text-muted)">
                Or
                <router-link to="/login" class="font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
                    sign in to your existing account
                </router-link>
            </p>
        </div>

        <div class="mt-8 w-full max-w-md mx-auto">
            <div class="glass py-8 px-4 sm:rounded-xl sm:px-10">
                <form class="space-y-6" @submit.prevent="handleRegister">
                    <div v-if="error" class="p-3 bg-red-500/10 text-(--color-error) border border-red-500/20 rounded-md text-sm">
                        {{ error }}
                    </div>

                    <div>
                        <label for="name" class="block text-sm font-medium text-(--color-heading)"> Display Name </label>
                        <div class="mt-1">
                            <input id="name" name="name" type="text" required v-model="name"
                                class="appearance-none block w-full px-3 py-2 border border-(--color-border) bg-(--color-background) text-(--color-heading) rounded-md shadow-sm placeholder-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="email" class="block text-sm font-medium text-(--color-heading)"> Email address </label>
                        <div class="mt-1">
                            <input id="email" name="email" type="email" autocomplete="email" required v-model="email"
                                class="appearance-none block w-full px-3 py-2 border border-(--color-border) bg-(--color-background) text-(--color-heading) rounded-md shadow-sm placeholder-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="password" class="block text-sm font-medium text-(--color-heading)"> Password </label>
                        <div class="mt-1">
                            <input id="password" name="password" type="password" autocomplete="new-password" required v-model="password"
                                class="appearance-none block w-full px-3 py-2 border border-(--color-border) bg-(--color-background) text-(--color-heading) rounded-md shadow-sm placeholder-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <button type="submit" :disabled="isLoading"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {{ isLoading ? 'Registering...' : 'Register' }}
                        </button>
                    </div>

                    <div class="mt-6">
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-(--color-border)"></div>
                            </div>
                            <div class="relative flex justify-center text-sm">
                                <span class="px-2 bg-(--color-background) text-(--color-text-muted)">Or continue with</span>
                            </div>
                        </div>

                        <div class="mt-6 flex justify-center">
                            <GoogleLogin :callback="handleGoogleCallback" />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </main>
</template>
