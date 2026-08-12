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
import TrophyIcon from './icons/TrophyIcon.vue';
import MessageIcon from './icons/MessageIcon.vue';
import UserDropdown from './UserDropdown.vue';
import { useUiStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';
import { useUnreadNotificationCount } from '../composables/useNotifications.js';

const route = useRoute();
const ui = useUiStore();
const auth = useAuthStore();
const isAdmin = computed(() => route.path === '/admin');
const { count: unreadCount } = useUnreadNotificationCount();
const badgeLabel = computed(() =>
  unreadCount.value > 99 ? '99+' : String(unreadCount.value),
);
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
      <router-link to="/leaderboard" class="hover:text-sky-600 transition-colors" title="Leaderboard">
        <TrophyIcon />
      </router-link>
      <router-link
        v-if="auth.isAuthenticated"
        to="/messages"
        class="hover:text-sky-600 transition-colors"
        title="Messages (DM)"
      >
        <MessageIcon />
      </router-link>
      <!-- Search sits rightmost in the primary nav -->
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
      <router-link
        v-if="auth.isAuthenticated"
        to="/notifications"
        class="relative p-2 rounded-lg text-(--color-text-muted) hover:text-(--color-heading) hover:bg-(--color-background-mute) transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
          />
        </svg>
        <!-- Unread badge: orange pill with count (realtime via SSE + short poll) -->
        <span
          v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-(--color-background)"
        >
          {{ badgeLabel }}
        </span>
      </router-link>
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
