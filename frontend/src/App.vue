<script setup lang="ts">
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useThemeStore } from './stores/theme';

// Initialize theme store so watchEffect applies data-theme to <html> immediately
useThemeStore();
</script>

<template>
  <div class="app-layout">
    <header>
      <Navbar />
    </header>
    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-content {
  flex: 1;
  width: 100%;
}
</style>
