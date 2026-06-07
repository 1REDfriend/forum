import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Cross-route UI state. Currently only the admin sidebar drawer:
 * Navbar.vue toggles it; AdminDashboardView.vue renders against it.
 */
export const useUiStore = defineStore('ui', () => {
  const adminSidebarOpen = ref(false);

  const openAdminSidebar = () => {
    adminSidebarOpen.value = true;
  };
  const closeAdminSidebar = () => {
    adminSidebarOpen.value = false;
  };
  const toggleAdminSidebar = () => {
    adminSidebarOpen.value = !adminSidebarOpen.value;
  };

  return { adminSidebarOpen, openAdminSidebar, closeAdminSidebar, toggleAdminSidebar };
});
