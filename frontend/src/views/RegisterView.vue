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
    <main class="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pt-24">
        <div class="w-full max-w-md">
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create a new account</h2>
            <p class="mt-2 text-center text-sm text-gray-600">
                Or
                <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
                    sign in to your existing account
                </router-link>
            </p>
        </div>

        <div class="mt-8 w-full max-w-md mx-auto">
            <div class="bg-white py-8 px-4 shadow-sm sm:rounded-xl border border-gray-100 sm:px-10">
                <form class="space-y-6" @submit.prevent="handleRegister">
                    <div v-if="error" class="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                        {{ error }}
                    </div>
                    
                    <div>
                        <label for="name" class="block text-sm font-medium text-gray-700"> Display Name </label>
                        <div class="mt-1">
                            <input id="name" name="name" type="text" required v-model="name"
                                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700"> Email address </label>
                        <div class="mt-1">
                            <input id="email" name="email" type="email" autocomplete="email" required v-model="email"
                                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700"> Password </label>
                        <div class="mt-1">
                            <input id="password" name="password" type="password" autocomplete="new-password" required v-model="password"
                                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <button type="submit" :disabled="isLoading"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {{ isLoading ? 'Registering...' : 'Register' }}
                        </button>
                    </div>

                    <div class="mt-6">
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-300"></div>
                            </div>
                            <div class="relative flex justify-center text-sm">
                                <span class="px-2 bg-white text-gray-500">Or continue with</span>
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
