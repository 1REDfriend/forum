<script setup lang="ts">
import { useAuthStore } from '../stores/auth.js';
import { storeToRefs } from 'pinia';
import CodeIcon from './icons/CodeIcon.vue';
import ForumIcon from './icons/ForumIcon.vue';
import HomeIcon from './icons/HomeIcon.vue';
import SearchIcon from './icons/SearchIcon.vue';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const authStore = useAuthStore();
const { isAuthenticated, user } = storeToRefs(authStore);
const router = useRouter();
const showDropdown = ref(false);

const handleLogout = () => {
    authStore.logout();
    showDropdown.value = false;
    router.push('/');
};

const toggleDropdown = () => {
    showDropdown.value = !showDropdown.value;
};

const closeDropdown = () => {
    showDropdown.value = false;
};

const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

            <router-link to="/search" class="hover:text-indigo-600 transition-colors" title="Search">
                <SearchIcon/>
            </router-link>
        </nav>

        <div class="flex items-center gap-4">
            <template v-if="isAuthenticated">
                <span class="text-sm text-slate-600 font-medium hidden md:block">Hello, {{ user?.name }}</span>
                
                <!-- User Dropdown -->
                <div class="relative">
                    <button @click="toggleDropdown" class="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full transition-all">
                        <div v-if="user?.avatar" class="w-9 h-9 rounded-full border border-gray-200 hover:border-indigo-400 transition-colors overflow-hidden">
                            <img :src="user.avatar" alt="Profile" class="w-full h-full object-cover" />
                        </div>
                        <div v-else class="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold hover:bg-indigo-700 transition-colors">
                            {{ getInitials(user?.name) }}
                        </div>
                    </button>

                    <!-- Dropdown Menu -->
                    <div v-if="showDropdown" class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                        <router-link to="/profile" @click="closeDropdown" 
                            class="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            👤 My Profile
                        </router-link>
                        <div class="border-t border-gray-100 my-1"></div>
                        <button @click="handleLogout" class="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                            🚪 Logout
                        </button>
                    </div>
                </div>

                <!-- Click outside to close -->
                <div v-if="showDropdown" @click="closeDropdown" class="fixed inset-0 z-40"></div>
            </template>
            <template v-else>
                <router-link to="/login" class="text-sm text-slate-600 hover:text-indigo-600 font-medium transition-colors">Login</router-link>
                <router-link to="/register" class="text-sm bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 font-medium transition-colors shadow-sm">Register</router-link>
            </template>
        </div>

    </div>
</template>