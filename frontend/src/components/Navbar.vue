<script setup lang="ts">
import CodeIcon from './icons/CodeIcon.vue';
import ForumIcon from './icons/ForumIcon.vue';
import HomeIcon from './icons/HomeIcon.vue';
import SearchIcon from './icons/SearchIcon.vue';
import UserDropdown from './UserDropdown.vue';
</script>

<template>
  <div class="navbar fixed w-full top-0 left-0 flex items-center justify-between px-6 md:px-12 h-16 z-50">
    <!-- Logo -->
    <router-link to="/" class="flex items-center text-indigo-600 font-bold gap-2 select-none">
      <CodeIcon />
      <span class="text-sm tracking-wider font-mono hidden lg:inline">IT.FORUM</span>
    </router-link>

    <!-- Primary Navigation -->
    <nav class="flex items-center gap-8 text-slate-500" aria-label="Primary navigation">
      <router-link to="/" class="hover:text-indigo-600 transition-colors" title="Home">
        <HomeIcon />
      </router-link>
      <router-link to="/forums" class="hover:text-indigo-600 transition-colors" title="Forums">
        <ForumIcon />
      </router-link>
      <router-link to="/search" class="hover:text-indigo-600 transition-colors" title="Search">
        <SearchIcon />
      </router-link>
    </nav>

    <!-- Right-side controls -->
    <div class="flex items-center gap-4">
      <UserDropdown />
    </div>
  </div>
</template>

<style scoped>
.navbar {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background 0.3s ease, border-color 0.3s ease;
}
</style>
