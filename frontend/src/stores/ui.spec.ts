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
