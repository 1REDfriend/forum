<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '../api/index.js';

const route = useRoute();
const router = useRouter();

const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const error = ref('');
const success = ref(false);

onMounted(() => {
  token.value = (route.query.token as string) || '';
  if (!token.value) {
    error.value = 'Invalid or missing reset token. Please request a new reset link.';
  }
});

const submit = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.';
    return;
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.';
    return;
  }
  isLoading.value = true;
  error.value = '';
  try {
    await authApi.resetPassword(token.value, password.value);
    success.value = true;
    setTimeout(() => router.push('/login'), 3000);
  } catch (err: any) {
    error.value = err.message || 'Reset failed. The link may have expired.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-16">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="text-3xl font-extrabold text-gray-900">Reset Password</h1>
        <p class="text-gray-500 mt-2">Enter your new password below.</p>
      </div>

      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <!-- Success -->
        <div v-if="success" class="text-center">
          <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p class="text-gray-700 font-medium">Password reset successfully!</p>
          <p class="text-sm text-gray-500 mt-1">Redirecting you to login...</p>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submit" class="space-y-5">
          <div v-if="error" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {{ error }}
            <router-link v-if="!token" to="/forgot-password" class="underline ml-2">Request new link</router-link>
          </div>

          <div>
            <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              id="new-password"
              v-model="password"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              placeholder="At least 6 characters"
              :disabled="!token"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition disabled:bg-gray-50"
            />
          </div>

          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              required
              autocomplete="new-password"
              placeholder="Repeat your password"
              :disabled="!token"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition disabled:bg-gray-50"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading || !token || !password || !confirmPassword"
            class="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Resetting...' : 'Reset Password' }}
          </button>

          <p class="text-center text-sm text-gray-500">
            <router-link to="/login" class="text-indigo-600 font-medium hover:underline">← Back to Login</router-link>
          </p>
        </form>
      </div>
    </div>
  </main>
</template>
