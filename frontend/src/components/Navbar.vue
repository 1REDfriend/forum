<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { motion } from 'motion-v';
import CodeIcon from './icons/CodeIcon.vue';
import ForumIcon from './icons/ForumIcon.vue';
import HomeIcon from './icons/HomeIcon.vue';
import MenuIcon from './icons/MenuIcon.vue';
import MoonIcon from './icons/MoonIcon.vue';
import SearchIcon from './icons/SearchIcon.vue';
import SunIcon from './icons/SunIcon.vue';
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
      class="items-center gap-8 text-(--color-text)"
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
    <div v-if="isAdmin" class="flex md:hidden items-center gap-3 text-(--color-text)">
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
        <MoonIcon v-if="ui.theme === 'light'" class="w-5 h-5" />
        <!-- sun (shown in dark mode) -->
        <SunIcon v-else class="w-5 h-5" />
      </button>
      <UserDropdown />
    </div>
  </motion.div>
</template>

<style scoped>
.navbar {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(18px) saturate(180%);
  transition: background 0.3s ease, border-color 0.3s ease;
}
</style>
