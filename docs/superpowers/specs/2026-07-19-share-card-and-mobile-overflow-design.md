# Thread share card + mobile overflow fix — Design

Date: 2026-07-19

## Problem

Two independent, small bugs reported against thread pages:

1. **Thread share thumbnail wrong.** When a thread is posted and its link is
   shared to social platforms, the preview thumbnail sometimes shows the thread
   author's banner image instead of the site's default OG card. The thumbnail
   should always be the site default OG card.

2. **Mobile layout breaks on long content.** On mobile, threads/posts whose
   markdown contains a wide table (or a very long unbroken string/URL) push the
   content past the screen edge, forcing horizontal scroll of the whole page and
   making text hard to read. Code blocks (`pre`) already scroll internally.

Both fixes are independent — no shared state, can land together or separately.

## Fix 1 — Thread share thumbnail = default site OG card

### Root cause

`backend/src/services/share.service.ts`, `threadOg()` sets:

```ts
image: thread.author?.banner ?? undefined,
```

`renderOgHtml` falls back to `DEFAULT_OG_IMAGE` (`${FRONTEND_URL}/og-default.png`)
only when `image` is `undefined`. So when the thread author has a banner set,
the share card uses the author banner rather than the site card.

This is the backend crawler-facing path (bots hit the `/share/thread/:id`
route and read these OG tags). The frontend `meta.ts` `setPageMeta` used by the
SPA already omits `image` for threads, so it already defaults correctly — no
frontend change needed.

### Change

- In `threadOg()`, remove the `image:` line entirely so `renderOgHtml` uses
  `DEFAULT_OG_IMAGE`.

### Scope

- **Thread only**, per request.
- `postOg` / `forumOg` already omit `image` → already default. No change.
- `userOg` intentionally keeps `user.banner ?? user.avatar` — a profile card
  showing the user's own image is correct. Out of scope.

### Test

Update `backend/src/services/share.service.test.ts`: a thread whose author has
a `banner` set must now emit `og:image` = the default card URL
(`.../og-default.png`), not the banner.

## Fix 2 — Wide tables / long strings no longer break mobile layout

### Root cause

`frontend/src/components/MarkdownRenderer.vue` styles:

- `table` has `width: 100%` but **no horizontal-scroll wrapper**. A table whose
  columns' min-content width exceeds the viewport forces the whole page wider.
- No `overflow-wrap` / `word-break` on the prose container, so a long unbroken
  URL or token pushes width too.
- `pre` already has `overflow-x: auto` — correct, keep it.

### Approach — CSS-only, in the renderer's `<style>` block

Chosen approach: no JS, no HTML post-processing, no sanitizer change. Confine
each risky element to its own box so the surrounding layout is unaffected.

Changes to `.prose-content` scoped styles:

- Container `.prose-content`: add `overflow-wrap: anywhere;` and
  `word-break: break-word;` so long words/URLs wrap instead of widening the box.
- `table`: add `display: block; max-width: 100%; overflow-x: auto;` so the table
  becomes its own horizontal-scroll container. Page layout no longer shifts;
  wide tables scroll within their box.
- `pre`: keep `overflow-x: auto`; add `max-width: 100%;` for safety.

### Trade-off

`display: block` on `table` means a narrow table shrinks to its content width
rather than stretching to fill the container. Acceptable — readability and a
stable layout outweigh full-bleed tables.

### Out of scope

`<main class="w-screen">` in `ThreadDetailView.vue` is left unchanged. `w-screen`
(`100vw`) can itself cause horizontal scroll when a desktop scrollbar is present,
but that is a separate concern and not the reported mobile symptom. Deferred.

## Verification

- **Fix 1:** run backend test suite; new assertion in `share.service.test.ts`
  passes.
- **Fix 2:** open a thread containing a wide table, a long code block, and a very
  long URL; view at 375px width. Confirm: no page-level horizontal scroll; the
  table scrolls inside its own box; long URL wraps.
