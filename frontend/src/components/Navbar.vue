<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { motion } from 'motion-v';
import CodeIcon from './icons/CodeIcon.vue';
import ForumIcon from './icons/ForumIcon.vue';
import HomeIcon from './icons/HomeIcon.vue';
import MenuIcon from './icons/MenuIcon.vue';
import SearchIcon from './icons/SearchIcon.vue';
import UserDropdown from './UserDropdown.vue';
import { useUiStore } from '../stores/ui';

const route = useRoute();
const ui = useUiStore();
const isAdmin = computed(() => route.path === '/admin');
</script>

<template>
  <motion.div class="navbar fixed rounded-full -translate-x-1/2 w-7/8 top-2 left-1/2 flex items-center justify-between px-6 md:px-12 h-16 z-50"
  :initial="{ opacity: 0, scale: 0.5 }"
  :animate="{ opacity: 1, scale: 1 }"
  :transition="{ease: [0, 0.71, 0.2, 1.01]}"
  >
    <!-- Logo -->
    <router-link to="/" class="flex items-center text-sky-600 font-bold gap-2 select-none">
      <CodeIcon />
      <span class="text-sm tracking-wider font-mono hidden lg:inline">IT.FORUM</span>
    </router-link>

    <!-- Primary Navigation (forum quick-nav; hidden on admin at mobile width) -->
    <nav
      class="items-center gap-8 text-slate-600"
      :class="isAdmin ? 'hidden md:flex' : 'flex'"
      aria-label="Primary navigation"
    >
      <router-link to="/" class="hover:text-sky-600 transition-colors" title="Home">
        <HomeIcon />
      </router-link>
      <router-link to="/forums" class="hover:text-sky-600 transition-colors" title="Forums">
        <ForumIcon />
      </router-link>
      <router-link to="/search" class="hover:text-sky-600 transition-colors" title="Search">
        <SearchIcon />
      </router-link>
    </nav>

    <!-- Admin context (mobile only): hamburger toggles the sidebar drawer -->
    <div v-if="isAdmin" class="flex md:hidden items-center gap-3 text-slate-300">
      <button
        type="button"
        @click="ui.toggleAdminSidebar()"
        class="hover:text-sky-600 transition-colors"
        aria-label="Toggle admin menu"
        :aria-expanded="ui.adminSidebarOpen"
      >
        <MenuIcon />
      </button>
      <span class="text-sm font-semibold tracking-wide">Admin Panel</span>
    </div>

    <!-- Right-side controls -->
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="p-2 rounded-lg text-(--color-text-muted) hover:text-(--color-heading) hover:bg-(--color-background-mute)"
        :aria-label="ui.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="ui.toggleTheme()"
      >
        <!-- moon (shown in light mode) -->
        <svg v-if="ui.theme === 'light'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <!-- sun (shown in dark mode) -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
      <UserDropdown />
    </div>
  </motion.div>
</template>

<style scoped>
.navbar {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(18px) saturate(180%);
  transition: background 0.3s ease, border-color 0.3s ease;
}
</style>
