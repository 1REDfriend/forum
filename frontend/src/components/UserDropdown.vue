<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth.js';
import { getInitials } from '../utils/helpers';

const authStore = useAuthStore();
const { isAuthenticated, user } = storeToRefs(authStore);
const router = useRouter();

const showDropdown = ref(false);

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const closeDropdown = () => {
  showDropdown.value = false;
};

const handleLogout = () => {
  authStore.logout();
  closeDropdown();
  router.push('/');
};
</script>

<template>
  <div class="flex items-center gap-4">
    <!-- Authenticated state -->
    <template v-if="isAuthenticated">
      <span class="text-sm text-(--color-text-muted) font-medium hidden md:block">
        Hello, {{ user?.name }}
      </span>

      <!-- Avatar button + Dropdown -->
      <div class="relative">
        <button
          @click="toggleDropdown"
          class="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full transition-all"
          aria-haspopup="true"
          :aria-expanded="showDropdown"
        >
          <img
            v-if="user?.avatar"
            :src="user.avatar"
            alt="Profile"
            class="w-9 h-9 rounded-full border border-(--color-border) hover:border-sky-400 transition-colors object-cover"
          />
          <div
            v-else
            class="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            {{ getInitials(user?.name) }}
          </div>
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="showDropdown"
          class="user-dropdown absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 z-50"
          role="menu"
        >
          <router-link
            v-if="user?.role === 'admin'"
            to="/admin"
            @click="closeDropdown"
            class="block px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 transition-colors font-semibold"
            role="menuitem"
          >
            ⚙️ Admin Panel
          </router-link>
          <router-link
            to="/profile"
            @click="closeDropdown"
            class="block px-4 py-2.5 text-sm text-(--color-text) hover:bg-(--color-background-mute) transition-colors"
            role="menuitem"
          >
            👤 My Profile
          </router-link>
          <div class="user-dropdown__divider border-t my-1" />
          <button
            @click="handleLogout"
            class="block w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            role="menuitem"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <!-- Backdrop to close dropdown on outside click -->
      <div
        v-if="showDropdown"
        @click="closeDropdown"
        class="fixed inset-0 z-40"
        aria-hidden="true"
      />
    </template>

    <!-- Guest state -->
    <template v-else>
      <router-link
        to="/login"
        class="text-sm text-(--color-text) hover:text-sky-700 dark:hover:text-sky-300 font-medium transition-colors"
      >
        Login
      </router-link>
      <router-link
        to="/register"
        class="text-sm bg-linear-to-b from-indigo-500 to-indigo-600 text-white px-5 py-2 rounded-full font-semibold shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
      >
        Register
      </router-link>
    </template>
  </div>
</template>

<style scoped>
.user-dropdown {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
}

.user-dropdown__divider {
  border-color: var(--color-border);
}
</style>
