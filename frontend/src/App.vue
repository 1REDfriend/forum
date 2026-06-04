<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();

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
