<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAuthStore } from './stores/auth';
import { useRealtime } from './composables/useRealtime.js';

const authStore = useAuthStore();

// Live notification badge / DM invalidation via SSE (reconnects after login)
useRealtime();

// Refresh the logged-in user (role/tier/profile) from the API on load so the UI
// reflects server-side changes without requiring a logout/login.
onMounted(() => {
  void authStore.fetchCurrentUser();
});
</script>

<template>
  <div class="app-layout">
    <header>
      <Navbar />
    </header>
    <main class="app-content">
      <RouterView />
    </main>
    <footer class="app-footer">
      <div class="footer-inner">
        <router-link to="/rules">Rules</router-link>
        <span class="dot">·</span>
        <router-link to="/help">Help</router-link>
        <span class="dot">·</span>
        <router-link to="/leaderboard">Leaderboard</router-link>
        <span class="dot">·</span>
        <router-link to="/calendar">Calendar</router-link>
        <span class="dot">·</span>
        <router-link to="/messages">Messages</router-link>
        <span class="dot">·</span>
        <router-link to="/forums">Forums</router-link>
      </div>
    </footer>
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

.app-footer {
  border-top: 1px solid var(--color-border);
  padding: 1.25rem 1rem 2rem;
  margin-top: auto;
}

.footer-inner {
  max-width: 64rem;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.footer-inner a {
  color: var(--color-text-muted);
  text-decoration: none;
}
.footer-inner a:hover {
  color: var(--color-heading);
}
.dot {
  opacity: 0.5;
}
</style>
