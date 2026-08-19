<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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

// Mobile off-canvas menu: primary nav + notifications + theme collapse into
// this on narrow viewports (the pill navbar has no room for all of them).
const mobileMenuOpen = ref(false);
watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false;
});
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

    <!-- Primary Navigation (forum quick-nav; collapses into the mobile menu below md) -->
    <nav
      class="hidden md:flex items-center gap-8 text-(--color-text)"
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
    <div class="flex items-center gap-2 md:gap-4">
      <router-link
        v-if="auth.isAuthenticated"
        to="/notifications"
        class="relative hidden md:inline-flex p-2 rounded-lg text-(--color-text-muted) hover:text-(--color-heading) hover:bg-(--color-background-mute) transition-colors"
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
        class="hidden md:inline-flex p-2 rounded-lg text-(--color-text-muted) hover:text-(--color-heading) hover:bg-(--color-background-mute)"
        :aria-label="ui.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="ui.toggleTheme()"
      >
        <!-- moon (shown in light mode) -->
        <MoonIcon v-if="ui.theme === 'light'" class="w-5 h-5" />
        <!-- sun (shown in dark mode) -->
        <SunIcon v-else class="w-5 h-5" />
      </button>
      <UserDropdown />
      <!-- Mobile menu toggle: primary nav + notifications + theme live here below md -->
      <button
        v-if="!isAdmin"
        type="button"
        class="flex md:hidden p-2 rounded-lg text-(--color-text-muted) hover:text-(--color-heading) hover:bg-(--color-background-mute)"
        aria-label="Toggle menu"
        :aria-expanded="mobileMenuOpen"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <MenuIcon v-if="!mobileMenuOpen" class="w-5 h-5" />
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </motion.div>

  <!-- Mobile menu panel: primary nav + notifications + theme toggle stacked -->
  <Transition name="mobile-menu">
    <div
      v-if="!isAdmin && mobileMenuOpen"
      class="glass fixed md:hidden top-20 -translate-x-1/2 left-1/2 w-7/8 max-w-sm p-3 z-40 flex flex-col gap-1 text-(--color-text)"
    >
      <router-link to="/" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-background-mute) hover:text-sky-600 transition-colors">
        <HomeIcon /> <span class="text-sm">Home</span>
      </router-link>
      <router-link to="/forums" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-background-mute) hover:text-sky-600 transition-colors">
        <ForumIcon /> <span class="text-sm">Forums</span>
      </router-link>
      <router-link to="/leaderboard" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-background-mute) hover:text-sky-600 transition-colors">
        <TrophyIcon /> <span class="text-sm">Leaderboard</span>
      </router-link>
      <router-link
        v-if="auth.isAuthenticated"
        to="/messages"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-background-mute) hover:text-sky-600 transition-colors"
      >
        <MessageIcon /> <span class="text-sm">Messages</span>
      </router-link>
      <router-link to="/search" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-background-mute) hover:text-sky-600 transition-colors">
        <SearchIcon /> <span class="text-sm">Search</span>
      </router-link>
      <router-link
        v-if="auth.isAuthenticated"
        to="/notifications"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-background-mute) hover:text-sky-600 transition-colors"
      >
        <span class="relative inline-flex">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
            />
          </svg>
          <span
            v-if="unreadCount > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-(--color-background)"
          >
            {{ badgeLabel }}
          </span>
        </span>
        <span class="text-sm">Notifications</span>
      </router-link>
      <button
        type="button"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-background-mute) hover:text-sky-600 transition-colors text-left"
        @click="ui.toggleTheme()"
      >
        <MoonIcon v-if="ui.theme === 'light'" class="w-5 h-5" />
        <SunIcon v-else class="w-5 h-5" />
        <span class="text-sm">{{ ui.theme === 'dark' ? 'Light mode' : 'Dark mode' }}</span>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.navbar {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(18px) saturate(180%);
  transition: background 0.3s ease, border-color 0.3s ease;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
