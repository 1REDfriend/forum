<script setup lang="ts">
import { useAuthStore } from '../stores/auth.js';
import { storeToRefs } from 'pinia';
import CodeIcon from './icons/CodeIcon.vue';
import ForumIcon from './icons/ForumIcon.vue';
import HomeIcon from './icons/HomeIcon.vue';
import SearchIcon from './icons/SearchIcon.vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const { isAuthenticated, user } = storeToRefs(authStore);
const router = useRouter();

const handleLogout = () => {
    authStore.logout();
    router.push('/');
};
</script>

<template>
    <div
        class="fixed w-full top-0 left-0 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 md:px-12 h-16 shadow-sm z-50">

        <router-link to="/" class="flex items-center text-indigo-600 font-bold gap-2 cursor-pointer select-none">
            <CodeIcon/>
            <span class="text-sm tracking-wider font-mono hidden lg:inline">IT.FORUM</span>
        </router-link>

        <nav class="flex items-center gap-8 text-slate-500">
            <router-link to="/" class="hover:text-indigo-600 transition-colors" title="Home">
                <HomeIcon/>
            </router-link>

            <router-link to="/" class="hover:text-indigo-600 transition-colors" title="Forums">
                <ForumIcon/>
            </router-link>

            <button class="hover:text-indigo-600 transition-colors" title="Search">
                <SearchIcon/>
            </button>
        </nav>

        <div class="flex items-center gap-4">
            <template v-if="isAuthenticated">
                <span class="text-sm text-slate-600 font-medium hidden md:block">Hello, {{ user?.name }}</span>
                <button @click="handleLogout" class="text-sm text-red-500 hover:text-red-700 transition-colors font-medium">Logout</button>
                <button class="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full transition-all ml-2">
                    <img src="https://lh3.googleusercontent.com/a/default-user=s96-c" alt="Profile"
                        class="w-9 h-9 rounded-full border border-gray-200 hover:border-indigo-400 transition-colors" />
                </button>
            </template>
            <template v-else>
                <router-link to="/login" class="text-sm text-slate-600 hover:text-indigo-600 font-medium transition-colors">Login</router-link>
                <router-link to="/register" class="text-sm bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 font-medium transition-colors shadow-sm">Register</router-link>
            </template>
        </div>

    </div>
</template>