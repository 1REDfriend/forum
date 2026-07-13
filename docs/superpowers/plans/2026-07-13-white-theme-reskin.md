# White Theme Reskin (Phase 1a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the forum frontend to a white/light shadcn-style theme matching creasy.club / photo.creasy.club, with an orange accent and a light-default + dark-toggle mechanism.

**Architecture:** Pure CSS-variable reskin. `:root` holds light tokens, `.dark` on `<html>` holds dark tokens. Tailwind v4 `@theme` remaps the existing indigo/violet/purple utility ramps to the orange accent ramp so most component markup needs no edits. Components that hardcode dark-era colors get spot fixes. Theme choice persists in localStorage, applied pre-paint by an inline script in `index.html`, toggled from `Navbar.vue` via the `ui` Pinia store.

**Tech Stack:** Vue 3, Tailwind CSS v4, `@fontsource-variable/inter`, `@fontsource/ibm-plex-sans-thai`, Pinia.

**Spec:** `docs/superpowers/specs/2026-07-13-white-theme-hono-tanstack-design.md`

**Working-tree note:** The repo already contains uncommitted partial light-theme edits to 8 files (`base.css`, `Forum.vue`, `Navbar.vue`, `UserDropdown.vue`, `LandingHomeView.vue`, `LoginView.vue`, `RegisterView.vue`, `SearchView.vue`). Task 1 replaces `base.css` wholesale (the uncommitted version is an intermediate step toward the same goal — overwriting it is intended). The other files' uncommitted edits are compatible spot fixes; keep them and build on top.

**Design tokens (measured live from the reference sites 2026-07-13):**

| Token | Light | Dark |
|---|---|---|
| background | `oklch(100% 0 0)` | `oklch(14.5% 0 0)` |
| foreground | `oklch(15.3% 0.006 107.1)` | `oklch(98.5% 0 0)` |
| card | `oklch(100% 0 0)` | `oklch(20.5% 0 0)` |
| primary (orange) | `oklch(55.3% 0.195 38.402)` (= Tailwind orange-700) | `oklch(64.6% 0.222 41.116)` (= Tailwind orange-600) |
| secondary / muted | `oklch(96.7% 0.001 286.375)` | `oklch(26.9% 0 0)` |
| muted-foreground | `oklch(55.6% 0 0)` | `oklch(70.8% 0 0)` |
| border / input | `oklch(93% 0.007 106.5)` | `oklch(100% 0 0 / 12%)` |
| radius | `0.625rem` | same |
| font | `"Inter Variable", "IBM Plex Sans Thai", sans-serif` | same |

---

### Task 1: Fonts + base.css token system

**Files:**
- Modify: `frontend/src/assets/base.css` (full replace)
- Modify: `frontend/package.json` (via bun add)

- [ ] **Step 1: Install self-hosted fonts**

```bash
cd frontend && bun add @fontsource-variable/inter @fontsource/ibm-plex-sans-thai
```

- [ ] **Step 2: Replace `frontend/src/assets/base.css` entirely with:**

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";
@import "@fontsource/ibm-plex-sans-thai/400.css";
@import "@fontsource/ibm-plex-sans-thai/500.css";
@import "@fontsource/ibm-plex-sans-thai/600.css";
@import "@fontsource/ibm-plex-sans-thai/700.css";

/* Class-based dark mode: `dark:` utilities follow the .dark class on <html>,
   not the OS preference (the inline script in index.html sets the class). */
@custom-variant dark (&:where(.dark, .dark *));

/* ============================================================================
   White / light theme matching creasy.club + photo.creasy.club (shadcn-style),
   orange accent (photo.creasy.club), light default with .dark override.
   ============================================================================ */
@theme {
  --font-sans: "Inter Variable", "IBM Plex Sans Thai", system-ui, sans-serif;

  --radius: 0.625rem;

  /* Brand action color — remap the indigo/violet/purple ramps (used throughout
     existing markup) to Tailwind's orange ramp so every existing *-indigo-* /
     gradient utility reads as the orange accent without markup edits. */
  --color-indigo-50: oklch(98% 0.016 73.684);
  --color-indigo-100: oklch(95.4% 0.038 75.164);
  --color-indigo-200: oklch(90.1% 0.076 70.697);
  --color-indigo-300: oklch(83.7% 0.128 66.29);
  --color-indigo-400: oklch(75% 0.183 55.934);
  --color-indigo-500: oklch(70.5% 0.213 47.604);
  --color-indigo-600: oklch(64.6% 0.222 41.116); /* hover / dark-mode primary */
  --color-indigo-700: oklch(55.3% 0.195 38.402); /* primary (photo.creasy.club) */
  --color-indigo-800: oklch(47% 0.157 37.304);
  --color-indigo-900: oklch(40.8% 0.123 38.172);
  --color-indigo-950: oklch(26.6% 0.079 36.259);

  --color-violet-400: oklch(75% 0.183 55.934);
  --color-violet-500: oklch(70.5% 0.213 47.604);
  --color-violet-600: oklch(64.6% 0.222 41.116);
  --color-purple-400: oklch(75% 0.183 55.934);
  --color-purple-500: oklch(70.5% 0.213 47.604);
  --color-purple-600: oklch(64.6% 0.222 41.116);
  --color-purple-700: oklch(55.3% 0.195 38.402);

  --color-brand-500: oklch(70.5% 0.213 47.604);
  --color-brand-600: oklch(64.6% 0.222 41.116);
  --color-sky-accent: oklch(64.6% 0.222 41.116);
}

:root {
  /* shadcn-style surface tokens — light (default) */
  --color-background: oklch(100% 0 0);
  --color-background-soft: oklch(96.7% 0.001 286.375);
  --color-background-mute: oklch(96.6% 0.005 106.5);

  --color-border: oklch(93% 0.007 106.5);
  --color-border-hover: oklch(86% 0.007 106.5);

  --color-heading: oklch(15.3% 0.006 107.1);
  --color-text: oklch(28% 0.005 107.1);
  --color-text-muted: oklch(55.6% 0 0);

  --section-gap: 96px;

  /* "glass" tokens now render as clean white cards with hairline borders
     (same var names so component styles keep working) */
  --glass-bg: oklch(100% 0 0);
  --glass-bg-strong: oklch(100% 0 0);
  --glass-border: oklch(93% 0.007 106.5);
  --glass-shadow: 0 1px 3px oklch(0% 0 0 / 0.08), 0 1px 2px oklch(0% 0 0 / 0.04);
}

.dark {
  --color-background: oklch(14.5% 0 0);
  --color-background-soft: oklch(20.5% 0 0);
  --color-background-mute: oklch(26.9% 0 0);

  --color-border: oklch(100% 0 0 / 12%);
  --color-border-hover: oklch(100% 0 0 / 24%);

  --color-heading: oklch(98.5% 0 0);
  --color-text: oklch(87% 0 0);
  --color-text-muted: oklch(70.8% 0 0);

  --glass-bg: oklch(20.5% 0 0);
  --glass-bg-strong: oklch(24% 0 0);
  --glass-border: oklch(100% 0 0 / 12%);
  --glass-shadow: 0 1px 3px oklch(0% 0 0 / 0.5), 0 1px 2px oklch(0% 0 0 / 0.3);
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  min-height: 100vh;
  color: var(--color-text);
  background: var(--color-background);
  line-height: 1.6;
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 400;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-heading);
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* ── Card surfaces ──────────────────────────────────────────────────────────
   `.glass` / `.glass-strong` keep their names (used across many components)
   but now render as clean bordered cards, matching the reference sites. */
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius);
}
.glass-strong {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius);
}
/* Legacy helper classes kept as no-ops so existing markup doesn't break. */
.glass-hi::before {
  content: none;
}
.text-glow-blue {
  box-shadow: none;
}
```

- [ ] **Step 3: Remove the Google Fonts `<link>` tags from `frontend/index.html`** (the three lines: two `preconnect` links and the `fonts.googleapis.com/css2?family=Inter` stylesheet link). Fonts are now self-hosted.

- [ ] **Step 4: Verify build**

```bash
cd frontend && bun run build-only
```
Expected: build succeeds, no CSS errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/assets/base.css frontend/index.html frontend/package.json frontend/bun.lock*
git commit -m "feat(theme): white shadcn-style token system with orange accent + self-hosted fonts"
```

---

### Task 2: Pre-paint theme script + ui store + Navbar toggle

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/stores/ui.ts`
- Modify: `frontend/src/components/Navbar.vue`

- [ ] **Step 1: Add the pre-paint script to `frontend/index.html`**, first thing inside `<head>` (before any stylesheet), so there is no flash of the wrong theme:

```html
<script>
  // Apply theme before first paint. Light is the default; dark applies when
  // the user chose it, or when the OS prefers dark and no choice is stored.
  (function () {
    try {
      var t = localStorage.getItem('theme');
      if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
</script>
```

- [ ] **Step 2: Add theme state to `frontend/src/stores/ui.ts`.** Extend the existing store (keep the admin-sidebar state as-is):

```ts
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
```

- [ ] **Step 3: Run the existing ui store spec**

```bash
cd frontend && bun run test:unit -- --run src/stores/ui.spec.ts
```
Expected: PASS (the spec tests the sidebar state, which is unchanged).

- [ ] **Step 4: Add a theme toggle button to `frontend/src/components/Navbar.vue`.** Place it in the right-side actions area, before the login/user controls. Wire to the store; sun icon shown in dark mode (click → light), moon icon in light mode (click → dark):

```vue
<button
  type="button"
  class="p-2 rounded-lg text-(--color-text-muted) hover:text-(--color-heading) hover:bg-(--color-background-mute)"
  :aria-label="uiStore.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
  @click="uiStore.toggleTheme()"
>
  <!-- moon (shown in light mode) -->
  <svg v-if="uiStore.theme === 'light'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
  <!-- sun (shown in dark mode) -->
  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
</button>
```

In the Navbar `<script setup>`, ensure the ui store is available (it may already be imported for the admin sidebar):

```ts
import { useUiStore } from '../stores/ui';
const uiStore = useUiStore();
```

- [ ] **Step 5: Verify in dev server** — start the frontend dev server, click the toggle: `<html>` gains/loses `.dark`, colors swap, choice survives reload (localStorage).

- [ ] **Step 6: Commit**

```bash
git add frontend/index.html frontend/src/stores/ui.ts frontend/src/components/Navbar.vue
git commit -m "feat(theme): light-default dark-toggle with pre-paint script and navbar button"
```

---

### Task 3: Component sweep — replace hardcoded dark-era colors

**Files (modify each; the first 8 already have compatible uncommitted partial edits — keep and extend them):**
- `frontend/src/components/Forum.vue`
- `frontend/src/components/ForumItem.vue`
- `frontend/src/components/Navbar.vue`
- `frontend/src/components/UserDropdown.vue`
- `frontend/src/components/ProfileCard.vue`
- `frontend/src/components/MarkdownEditor.vue`
- `frontend/src/components/MarkdownRenderer.vue`
- `frontend/src/components/ReportButton.vue`
- `frontend/src/components/ShareButton.vue`
- anything under `frontend/src/components/animations/` and `frontend/src/components/icons/` that hardcodes colors

**Conversion rules (apply mechanically in every file):**

| Old (dark-era) pattern | New |
|---|---|
| `text-white`, `text-slate-100/200` on content text | `text-(--color-heading)` for headings/emphasis, `text-(--color-text)` for body |
| `text-slate-400/500`, `text-white/60` | `text-(--color-text-muted)` |
| `bg-white/5`, `bg-white/10`, `bg-slate-800/900` panel fills | `.glass` class or `bg-(--color-background-soft)` |
| `border-white/10`, `border-slate-700` | `border-(--color-border)` |
| `hover:bg-white/10` | `hover:bg-(--color-background-mute)` |
| dark gradient hero/backgrounds (`from-slate-900`, navy hexes) | plain `bg-(--color-background)` or a subtle `bg-(--color-background-soft)` band |
| indigo/violet/purple utilities | leave unchanged (Task 1 remapped them to orange) |

Buttons: primary action = `bg-indigo-700 hover:bg-indigo-600 text-white` (renders orange via the remap). Secondary = `border border-(--color-border) bg-(--color-background) hover:bg-(--color-background-soft) text-(--color-heading)`.

- [ ] **Step 1: Find every hardcoded color in the component set**

```bash
cd frontend && grep -rnE "slate-[0-9]|gray-[0-9]|white/[0-9]|text-white|bg-white|#[0-9a-fA-F]{3,8}|rgba?\(" src/components --include=*.vue
```

- [ ] **Step 2: Apply the conversion rules to every hit.** Any `<style scoped>` blocks with hardcoded hex/rgba colors switch to the CSS variables (`var(--color-...)`, `var(--glass-...)`).

- [ ] **Step 3: Verify each component visually in the dev server, in both light and dark** (toggle via navbar). Check: text readable, borders visible, hover states visible, no leftover navy/dark panels in light mode, no white-on-white in dark mode.

- [ ] **Step 4: Run existing component tests**

```bash
cd frontend && bun run test:unit -- --run
```
Expected: all existing specs PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components
git commit -m "feat(theme): convert shared components to token-based light/dark colors"
```

---

### Task 4: View sweep — auth + landing + search views

**Files:**
- `frontend/src/views/LandingHomeView.vue`
- `frontend/src/views/LoginView.vue`
- `frontend/src/views/RegisterView.vue`
- `frontend/src/views/ForgotPasswordView.vue`
- `frontend/src/views/ResetPasswordView.vue`
- `frontend/src/views/SearchView.vue`
- `frontend/src/views/NotFoundView.vue`

- [ ] **Step 1: Apply the Task 3 conversion rules to each file** (same grep, scoped to these files). Landing hero: white background, near-black heading, orange accent on CTAs — mirror creasy.club's clean hero (large heading, muted subtitle, one primary orange button). Auth forms: white card (`.glass`), hairline border, labels in `--color-heading`, inputs `border-(--color-border) bg-(--color-background) focus:border-indigo-500`.

- [ ] **Step 2: Verify each view in the dev server in both themes.** Auth flows must remain functional (login/register submit still works against the backend).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views
git commit -m "feat(theme): convert landing, auth, and search views to light theme"
```

---

### Task 5: View sweep — forum + thread + profile + admin views

**Files:**
- `frontend/src/views/ForumHomeView.vue`
- `frontend/src/views/ForumView.vue`
- `frontend/src/views/ForumCreate.vue`
- `frontend/src/views/ThreadCreateView.vue`
- `frontend/src/views/ThreadDetailView.vue`
- `frontend/src/views/ProfileView.vue`
- `frontend/src/views/AdminDashboardView.vue`

- [ ] **Step 1: Apply the Task 3 conversion rules to each file.** Thread/post cards: white card, hairline border, `--radius` corners, minimal shadow — match photo.creasy.club's card grid feel. Admin dashboard tables: `bg-(--color-background)` rows, `border-(--color-border)` dividers, `bg-(--color-background-soft)` header row.

- [ ] **Step 2: Markdown content check** — rendered markdown (MarkdownRenderer) must be readable in both themes: code blocks get `bg-(--color-background-mute)`, blockquotes `border-(--color-border)`, links `text-indigo-700` (renders orange).

- [ ] **Step 3: Verify each view in the dev server in both themes**, including one full flow: open forum → open thread → posts render → like button → reply editor visible.

- [ ] **Step 4: Run all frontend tests + typecheck**

```bash
cd frontend && bun run test:unit -- --run && bun run type-check
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views frontend/src/components
git commit -m "feat(theme): convert forum, thread, profile, and admin views to light theme"
```

---

### Task 6: Final visual QA pass

- [ ] **Step 1: Full click-through in the dev server** — every route in both light and dark: `/`, `/login`, `/register`, `/forgot-password`, `/search`, forum home, forum view, thread create, thread detail, profile, admin dashboard, 404.

- [ ] **Step 2: Residual color audit**

```bash
cd frontend && grep -rnE "slate-[0-9]|#0a1628|#0f1f3a|#14264a|from-slate|bg-slate" src --include=*.vue
```
Expected: no hits (or only justified ones, e.g. syntax-highlighting themes).

- [ ] **Step 3: Fix anything found, re-verify, commit**

```bash
git add -A frontend/src
git commit -m "fix(theme): final QA pass for light/dark reskin"
```
