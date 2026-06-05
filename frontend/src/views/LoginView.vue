<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
    isLoading.value = true;
    error.value = '';
    try {
        await authStore.login({ email: email.value, password: password.value });
        router.push('/');
    } catch (err: any) {
        error.value = err.message || 'Login failed';
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
        error.value = err.message || 'Google Login failed';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <main class="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pt-24">
        <div class="w-full max-w-md">
            <h2 class="mt-6 text-center text-3xl font-extrabold text-slate-100">Sign in to your account</h2>
            <p class="mt-2 text-center text-sm text-slate-400">
                Or
                <router-link to="/register" class="font-medium text-sky-400 hover:text-sky-300">
                    create a new account
                </router-link>
            </p>
        </div>

        <div class="mt-8 w-full max-w-md">
            <div class="bg-white/5 backdrop-blur-xl py-8 px-4 shadow-xl sm:rounded-xl border border-white/10 sm:px-10">
                <form class="space-y-6" @submit.prevent="handleLogin">
                    <div v-if="error" class="p-3 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md text-sm">
                        {{ error }}
                    </div>
                    
                    <div>
                        <label for="email" class="block text-sm font-medium text-slate-300"> Email address </label>
                        <div class="mt-1">
                            <input id="email" name="email" type="email" autocomplete="email" required v-model="email"
                                class="appearance-none block w-full px-3 py-2 border border-white/15 bg-white/5 text-slate-100 rounded-md shadow-sm placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label for="password" class="block text-sm font-medium text-slate-300">Password</label>
                            <router-link to="/forgot-password" class="text-xs text-sky-400 hover:underline">
                                Forgot password?
                            </router-link>
                        </div>
                        <div class="mt-1">
                            <input id="password" name="password" type="password" autocomplete="current-password" required v-model="password"
                                class="appearance-none block w-full px-3 py-2 border border-white/15 bg-white/5 text-slate-100 rounded-md shadow-sm placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <button type="submit" :disabled="isLoading"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {{ isLoading ? 'Signing in...' : 'Sign in' }}
                        </button>
                    </div>

                    <div class="mt-6">
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-white/15"></div>
                            </div>
                            <div class="relative flex justify-center text-sm">
                                <span class="px-2 bg-slate-900 text-slate-400">Or continue with</span>
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
