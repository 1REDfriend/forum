# Thread share card + mobile overflow fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thread share links always preview the site's default OG card, and wide tables / long strings stop breaking mobile thread layout.

**Architecture:** Two independent, isolated fixes. Fix 1 is a one-line change in the backend OG-rendering service, covered by a new bun unit test that mocks the thread repository. Fix 2 is CSS-only in the Vue markdown renderer, verified visually in the browser preview at mobile width.

**Tech Stack:** Bun + Hono (backend), `bun:test`. Vue 3 SFC + Tailwind + scoped CSS (frontend), `marked` + `DOMPurify` for markdown.

Spec: `docs/superpowers/specs/2026-07-19-share-card-and-mobile-overflow-design.md`

---

## Task 1: Thread OG card always uses the default site image

**Files:**
- Modify: `backend/src/services/share.service.ts:58-72` (`threadOg`)
- Test (create): `backend/src/services/share.service.threadOg.test.ts`

Context: `threadOg()` currently passes `image: thread.author?.banner ?? undefined`
to `renderOgHtml`. `renderOgHtml` only falls back to `DEFAULT_OG_IMAGE`
(`.../og-default.png`) when `image` is `undefined`. So a thread whose author has
a banner emits the banner as `og:image`. We want the default site card always.

A new test file (not the existing `share.service.test.ts`) is used so
`mock.module` runs **before** `share.service` is first imported — otherwise the
service's `threadRepository` binding is already resolved to the real module.

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/share.service.threadOg.test.ts`:

```ts
import { test, expect, mock } from 'bun:test';

// Mock the repository BEFORE importing the service so the service picks up the mock.
mock.module('../repositories/thread.repository.js', () => ({
  threadRepository: {
    findById: async (_id: string) => ({
      id: 'abc',
      title: 'A Thread',
      content: 'thread body text',
      author: { name: 'Bob', banner: 'https://cdn.example/author-banner.png' },
      forum: { name: 'General' },
    }),
  },
}));

test('thread share card always uses the default site OG image, even when the author has a banner', async () => {
  const { shareService } = await import('./share.service.js');
  const html = await shareService.threadOg('abc');
  expect(html).not.toBeNull();
  expect(html!).toContain('/og-default.png');
  expect(html!).not.toContain('author-banner.png');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && bun test src/services/share.service.threadOg.test.ts`
Expected: FAIL — output contains `author-banner.png` (the `not.toContain`
assertion fails), because `threadOg` still emits the author banner.

- [ ] **Step 3: Make the minimal change**

In `backend/src/services/share.service.ts`, `threadOg()`, delete the `image`
line (and its two preceding comment lines) so `renderOgHtml` uses the default.

Before:

```ts
    return renderOgHtml({
      title: thread.title,
      description: `${snippet(thread.content, 160)}${inForum}${by}`,
      url: `${FRONTEND_URL}/thread/${id}`,
      type: 'article',
      // Author avatars are small/square; prefer the author banner if set,
      // else fall back to the default site card.
      image: thread.author?.banner ?? undefined,
    });
```

After:

```ts
    return renderOgHtml({
      title: thread.title,
      description: `${snippet(thread.content, 160)}${inForum}${by}`,
      url: `${FRONTEND_URL}/thread/${id}`,
      type: 'article',
      // Always use the default site OG card for thread shares.
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && bun test src/services/share.service.threadOg.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full share test group for no regressions**

Run: `cd backend && bun test src/services/share.service`
Expected: PASS (existing `share.service.test.ts` + new file).

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/share.service.ts backend/src/services/share.service.threadOg.test.ts
git commit -m "fix(share): thread OG card always uses default site image"
```

---

## Task 2: Contain wide tables / long strings in the markdown renderer

**Files:**
- Modify: `frontend/src/components/MarkdownRenderer.vue` (`<style scoped>` block only)

Context: `.prose-content :deep(table)` has `width: 100%` but no horizontal-scroll
box, so a wide table pushes the page past the viewport on mobile. There is also
no `overflow-wrap`, so long unbroken URLs/tokens widen the layout. `pre` already
has `overflow-x: auto`. This task is CSS-only — no change to markdown parsing,
sanitization, or template. There is no unit test; verification is visual in the
browser preview per the spec.

- [ ] **Step 1: Add wrap rule to the prose container**

In `frontend/src/components/MarkdownRenderer.vue`, change the `.prose-content`
paragraph rule region. Add an `overflow-wrap` rule to the container. Locate:

```css
.prose-content :deep(p) {
  margin: 0.6em 0;
  line-height: 1.7;
}
```

Immediately BEFORE it, add:

```css
.prose-content {
  overflow-wrap: anywhere;
  word-break: break-word;
}
```

- [ ] **Step 2: Make wide tables scroll within their own box**

Locate:

```css
.prose-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
}
```

Replace with:

```css
.prose-content :deep(table) {
  display: block;
  border-collapse: collapse;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  margin: 0.8em 0;
}
```

- [ ] **Step 3: Cap pre width for safety**

Locate:

```css
.prose-content :deep(pre) {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1em 1.2em;
  overflow-x: auto;
  margin: 0.8em 0;
}
```

Add `max-width: 100%;` (keep everything else):

```css
.prose-content :deep(pre) {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1em 1.2em;
  max-width: 100%;
  overflow-x: auto;
  margin: 0.8em 0;
}
```

- [ ] **Step 4: Verify in the browser preview at mobile width**

Start the frontend dev server via `preview_start` ({name} from
`.claude/launch.json`; if a worktree is in play see the worktree/preview gotcha
and start it manually + `preview_start({url})`).

Open a thread whose first post contains all three stressors. If none exists,
create one (or temporarily edit an existing thread) with markdown like:

```
| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
|----------|----------|----------|----------|----------|----------|----------|
| valueeeeeeeee | valueeeeeeeee | valueeeeeeeee | valueeeeeeeee | valueeeeeeeee | valueeeeeeeee | valueeeeeeeee |

https://example.com/some/really/really/really/really/long/unbroken/url/that/would/otherwise/overflow/the/viewport/aaaaaaaaaaaaaaaaaaaaaaaaaaaa

​```
some very long single line of code aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
​```
```

`resize_window` to mobile (375×812). Confirm via `read_page` / screenshot:
- No page-level horizontal scrollbar (body does not scroll sideways).
- The wide table scrolls horizontally **inside its own box**.
- The long URL wraps instead of widening the page.
- The code block still scrolls inside its own box.

Take a screenshot as proof.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/MarkdownRenderer.vue
git commit -m "fix(markdown): contain wide tables and long strings on mobile"
```

---

## Self-Review

- **Spec coverage:** Fix 1 (thread OG → default card) = Task 1. Fix 2 (tables +
  long strings contained; `pre` kept) = Task 2. `w-screen` explicitly out of
  scope in spec — no task, correct.
- **Placeholders:** none — every code/CSS step shows exact before/after.
- **Type consistency:** Task 1 uses `shareService.threadOg` and the existing
  `renderOgHtml` fallback to `DEFAULT_OG_IMAGE`; names match `share.service.ts`.
  Mock path `../repositories/thread.repository.js` matches the service import.
