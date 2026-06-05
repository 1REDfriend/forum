<script setup lang="ts">
</script>

<template>
    <main class="min-h-screen flex flex-col items-center justify-center pt-16">
        <div class="text-center px-6">
            <h1 class="text-8xl font-extrabold text-sky-400 mb-4">404</h1>
            <h2 class="text-2xl font-bold text-slate-100 mb-2">Page Not Found</h2>
            <p class="text-slate-400 mb-8 max-w-md mx-auto">
                Sorry, the page you're looking for doesn't exist or has been moved.
            </p>
            <router-link to="/"
                class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-medium transition-colors shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                Back to Home
            </router-link>
        </div>
    </main>
</template>
