<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from '../api/index.js';

const email = ref('');
const isLoading = ref(false);
const error = ref('');
const successMessage = ref('');

const submit = async () => {
  if (!email.value.trim()) return;
  isLoading.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const result = await authApi.forgotPassword(email.value.trim());
    successMessage.value = result.message;
    email.value = '';
  } catch (err: any) {
    error.value = err.message || 'Something went wrong. Please try again.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <main class="min-h-screen flex items-center justify-center px-4 py-16">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 class="text-3xl font-extrabold text-slate-100">Forgot Password</h1>
        <p class="text-slate-400 mt-2">Enter your email and we'll send you a reset link.</p>
      </div>

      <div class="bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-8">
        <!-- Success State -->
        <div v-if="successMessage" class="text-center">
          <div class="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p class="text-slate-300 font-medium">{{ successMessage }}</p>
          <p class="text-sm text-slate-400 mt-2">Check your inbox (and spam folder).</p>
          <router-link to="/login" class="mt-6 inline-block text-sky-400 hover:underline text-sm font-medium">
            ← Back to Login
          </router-link>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submit" class="space-y-5">
          <div v-if="error" class="p-3 bg-red-500/10 text-red-300 rounded-lg text-sm border border-red-500/20">
            {{ error }}
          </div>

          <div>
            <label for="forgot-email" class="block text-sm font-medium text-slate-300 mb-1">Email address</label>
            <input
              id="forgot-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full px-4 py-2.5 border border-white/15 bg-white/5 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading || !email.trim()"
            class="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
          </button>

          <p class="text-center text-sm text-slate-400">
            Remembered it?
            <router-link to="/login" class="text-sky-400 font-medium hover:underline">Sign in</router-link>
          </p>
        </form>
      </div>
    </div>
  </main>
</template>
