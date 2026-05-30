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
      <span class="text-sm text-slate-600 font-medium hidden md:block">
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
            class="w-9 h-9 rounded-full border border-gray-200 hover:border-indigo-400 transition-colors object-cover"
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
            class="block px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors font-semibold"
            role="menuitem"
          >
            ⚙️ Admin Panel
          </router-link>
          <router-link
            to="/profile"
            @click="closeDropdown"
            class="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            role="menuitem"
          >
            👤 My Profile
          </router-link>
          <div class="user-dropdown__divider border-t my-1" />
          <button
            @click="handleLogout"
            class="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
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
        class="text-sm text-slate-600 hover:text-indigo-600 font-medium transition-colors"
      >
        Login
      </router-link>
      <router-link
        to="/register"
        class="text-sm bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 font-medium transition-colors shadow-sm"
      >
        Register
      </router-link>
    </template>
  </div>
</template>

<style scoped>
.user-dropdown {
  background: #ffffff;
  border: 1px solid #f1f5f9;
}

[data-theme="dark"] .user-dropdown {
  background: #1e293b;
  border: 1px solid #334155;
}

.user-dropdown__divider {
  border-color: #f1f5f9;
}

[data-theme="dark"] .user-dropdown__divider {
  border-color: #334155;
}
</style>
