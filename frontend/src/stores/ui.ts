import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Cross-route UI state: admin sidebar drawer + color theme.
 * The theme class is applied pre-paint by an inline script in index.html;
 * this store reads that initial state and owns subsequent toggles.
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

  const theme = ref<'light' | 'dark'>(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light',
  );

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme.value === 'dark');
    try {
      localStorage.setItem('theme', theme.value);
    } catch {
      /* ignore */
    }
  };

  return {
    adminSidebarOpen,
    openAdminSidebar,
    closeAdminSidebar,
    toggleAdminSidebar,
    theme,
    toggleTheme,
  };
});
