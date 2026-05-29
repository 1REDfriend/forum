import { defineStore } from 'pinia';
import { ref, computed, watchEffect } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(
    (localStorage.getItem('theme') as ThemeMode) || 'system',
  );

  // Track system preference
  const systemPrefersDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    systemPrefersDark.value = e.matches;
  });

  // Computed: actual resolved theme (light or dark)
  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (mode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light';
    }
    return mode.value;
  });

  const isDark = computed(() => resolvedTheme.value === 'dark');

  // Apply theme to <html> element
  watchEffect(() => {
    const html = document.documentElement;
    if (resolvedTheme.value === 'dark') {
      html.setAttribute('data-theme', 'dark');
      html.classList.add('dark');
    } else {
      html.setAttribute('data-theme', 'light');
      html.classList.remove('dark');
    }
  });

  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode;
    localStorage.setItem('theme', newMode);
  };

  return {
    mode,
    resolvedTheme,
    isDark,
    setMode,
  };
});
