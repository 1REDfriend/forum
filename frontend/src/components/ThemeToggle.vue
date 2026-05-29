<script setup lang="ts">
import { useThemeStore, type ThemeMode } from '../stores/theme';
import { storeToRefs } from 'pinia';

const themeStore = useThemeStore();
const { mode, isDark } = storeToRefs(themeStore);

const options: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];
</script>

<template>
  <div class="theme-toggle-wrapper" role="group" aria-label="Theme selector">
    <div class="theme-toggle-group">
      <button
        v-for="option in options"
        :key="option.value"
        class="theme-btn"
        :class="{ active: mode === option.value }"
        :title="option.label"
        :aria-pressed="mode === option.value"
        @click="themeStore.setMode(option.value)"
      >
        <span class="theme-btn-icon">{{ option.icon }}</span>
        <span class="theme-btn-label">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-toggle-wrapper {
  display: flex;
  align-items: center;
}

.theme-toggle-group {
  display: flex;
  align-items: center;
  background: var(--theme-toggle-bg);
  border: 1px solid var(--theme-toggle-border);
  border-radius: 9999px;
  padding: 3px;
  gap: 2px;
  transition: all 0.3s ease;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
  color: var(--theme-btn-color);
  white-space: nowrap;
  line-height: 1;
}

.theme-btn-icon {
  font-size: 0.875rem;
  line-height: 1;
}

.theme-btn-label {
  display: none;
}

@media (min-width: 768px) {
  .theme-btn-label {
    display: inline;
  }
}

.theme-btn:hover:not(.active) {
  background: var(--theme-btn-hover-bg);
  color: var(--theme-btn-hover-color);
}

.theme-btn.active {
  background: var(--theme-btn-active-bg);
  color: var(--theme-btn-active-color);
  box-shadow: 0 1px 3px var(--theme-btn-active-shadow);
}
</style>
