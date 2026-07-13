import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from './ui';

describe('ui store — admin sidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('is closed by default', () => {
    const ui = useUiStore();
    expect(ui.adminSidebarOpen).toBe(false);
  });

  it('openAdminSidebar sets it true', () => {
    const ui = useUiStore();
    ui.openAdminSidebar();
    expect(ui.adminSidebarOpen).toBe(true);
  });

  it('closeAdminSidebar sets it false', () => {
    const ui = useUiStore();
    ui.openAdminSidebar();
    ui.closeAdminSidebar();
    expect(ui.adminSidebarOpen).toBe(false);
  });

  it('toggleAdminSidebar flips the state', () => {
    const ui = useUiStore();
    ui.toggleAdminSidebar();
    expect(ui.adminSidebarOpen).toBe(true);
    ui.toggleAdminSidebar();
    expect(ui.adminSidebarOpen).toBe(false);
  });
});

describe('ui store — theme', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('defaults to light when <html> has no dark class', () => {
    const ui = useUiStore();
    expect(ui.theme).toBe('light');
  });

  it('initializes to dark when <html> already has the dark class (pre-paint script ran)', () => {
    document.documentElement.classList.add('dark');
    const ui = useUiStore();
    expect(ui.theme).toBe('dark');
  });

  it('toggleTheme flips the ref, toggles the dark class, and persists to localStorage', () => {
    const ui = useUiStore();

    ui.toggleTheme();
    expect(ui.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    ui.toggleTheme();
    expect(ui.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
