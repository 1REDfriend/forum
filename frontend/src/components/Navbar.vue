<script setup lang="ts">
import { motion } from 'motion-v';
import CodeIcon from './icons/CodeIcon.vue';
import ForumIcon from './icons/ForumIcon.vue';
import HomeIcon from './icons/HomeIcon.vue';
import SearchIcon from './icons/SearchIcon.vue';
import UserDropdown from './UserDropdown.vue';
</script>

<template>
  <motion.div class="navbar fixed rounded-full -translate-x-1/2 w-7/8 top-2 left-1/2 flex items-center justify-between px-6 md:px-12 h-16 z-50"
  :initial="{ opacity: 0, scale: 0.5 }"
  :animate="{ opacity: 1, scale: 1 }"
  :transition="{ease: [0, 0.71, 0.2, 1.01]}"
  >
    <!-- Logo -->
    <router-link to="/" class="flex items-center text-sky-400 font-bold gap-2 select-none">
      <CodeIcon />
      <span class="text-sm tracking-wider font-mono hidden lg:inline">IT.FORUM</span>
    </router-link>

    <!-- Primary Navigation -->
    <nav class="flex items-center gap-8 text-slate-300" aria-label="Primary navigation">
      <router-link to="/" class="hover:text-sky-400 transition-colors" title="Home">
        <HomeIcon />
      </router-link>
      <router-link to="/forums" class="hover:text-sky-400 transition-colors" title="Forums">
        <ForumIcon />
      </router-link>
      <router-link to="/search" class="hover:text-sky-400 transition-colors" title="Search">
        <SearchIcon />
      </router-link>
    </nav>

    <!-- Right-side controls -->
    <div class="flex items-center gap-4">
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
