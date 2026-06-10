# Social Share Metadata (OG/Twitter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every shareable page (landing, forum list, a forum, a user profile, plus the existing thread/post) produces a rich link preview — title, description, and a 1200×630 thumbnail — when pasted into Facebook, X/Twitter, Discord, LINE, Slack, etc.

**Architecture:** Two layers. (1) A **static baseline**: real OG/Twitter tags + a default social card image baked into `index.html`, so any URL served by the SPA shell (landing `/`, `/forums`, `/search`, auth pages) gets a correct generic preview. (2) **Per-entity server rendering**: the backend already serves crawler-only OG HTML for threads/posts via `/share/*` with nginx UA-sniffing; we extend it to forums and user profiles, give every card a proper default image, and enrich descriptions. A small client-side helper also updates `document.title` + meta per route for browser tabs and JS-executing crawlers (Googlebot).

**Tech Stack:** Backend: Elysia + Bun (`bun:test`). Frontend: Vue 3 + Vite + vue-router + Vitest. Edge: nginx (crawler UA `map` + `proxy_pass`). Image gen: `sharp` (one-time SVG→PNG rasterize).

---

## Current State (verified 2026-06-10)

- OG works **only** for `/thread/:id` (`og:image` = author avatar, wrong aspect ratio) and `/share/post/:id`. See [backend/src/services/share.service.ts](backend/src/services/share.service.ts).
- nginx ([frontend/nginx.conf](frontend/nginx.conf)) sniffs crawler UA and proxies `/thread/:id` → backend `/share/thread/:id`. No other path is routed.
- [frontend/index.html](frontend/index.html) has a static `<title>IT.Forum</title>` and **zero** OG/Twitter tags. Landing `/`, `/forums`, `/forum/:id`, `/user/:id`, `/search` therefore produce a blank/garbage preview.
- No default social image exists — only `frontend/public/favicon.ico`.
- No client-side `document.title` / meta updates anywhere ([frontend/src/main.ts](frontend/src/main.ts), router has no `afterEach` meta hook).

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `frontend/public/og-card.svg` | Source artwork for the default 1200×630 social card | Create |
| `frontend/scripts/gen-og-image.mjs` | One-time rasterize SVG → `og-default.png` via sharp | Create |
| `frontend/public/og-default.png` | The committed default social card (crawlers fetch this) | Create (generated) |
| `frontend/index.html` | Static baseline OG/Twitter tags using `%VITE_SITE_URL%` | Modify |
| `frontend/.env`, `frontend/.env.example` | Add `VITE_SITE_URL` | Modify |
| `docker-compose.yml` | Pass `VITE_SITE_URL` as a frontend build arg | Modify |
| `frontend/src/utils/meta.ts` | `setPageMeta()` — updates `<title>` + og/twitter tags at runtime | Create |
| `frontend/src/utils/meta.test.ts` | Unit test for `setPageMeta` | Create |
| `frontend/src/router/index.ts` | `afterEach` hook applies per-route default meta | Modify |
| `frontend/src/views/ThreadDetailView.vue`, `ForumView.vue`, `ProfileView.vue` | Call `setPageMeta` with live entity data | Modify |
| `backend/src/services/share.service.ts` | Default image, `og:type`, `forumOg`, `userOg`, richer thread/post text | Modify |
| `backend/src/services/share.service.test.ts` | Tests for new render fields + service methods | Modify |
| `backend/src/routes/share.routes.ts` | Add `/share/forum/:id`, `/share/user/:id` | Modify |
| `frontend/nginx.conf` | Route crawler hits on `/forum/:id` and `/user/:id` to `/share/*` | Modify |

---

## Task 1: Default social card image

**Files:**
- Create: `frontend/public/og-card.svg`
- Create: `frontend/scripts/gen-og-image.mjs`
- Create (generated): `frontend/public/og-default.png`
- Modify: `frontend/package.json`

- [ ] **Step 1: Create the SVG source card**

Create `frontend/public/og-card.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="64" y="64" width="120" height="120" rx="28" fill="#6366f1"/>
  <text x="124" y="150" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff" text-anchor="middle">&lt;/&gt;</text>
  <text x="64" y="360" font-family="Inter, Arial, sans-serif" font-size="96" font-weight="700" fill="#ffffff">IT.Forum</text>
  <text x="64" y="440" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="400" fill="#94a3b8">A community for developers — ask, share, and grow.</text>
</svg>
```

- [ ] **Step 2: Add sharp + the generation script**

Run (from `frontend/`):

```bash
npm install --save-dev sharp
```

Create `frontend/scripts/gen-og-image.mjs`:

```js
// One-time rasterizer: SVG source -> committed PNG social card.
// Run: node scripts/gen-og-image.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, '../public/og-card.svg'));

await sharp(svg)
  .resize(1200, 630)
  .png()
  .toFile(join(here, '../public/og-default.png'));

console.log('Wrote frontend/public/og-default.png (1200x630)');
```

- [ ] **Step 3: Generate the PNG**

Run (from `frontend/`):

```bash
node scripts/gen-og-image.mjs
```

Expected: `Wrote frontend/public/og-default.png (1200x630)`

- [ ] **Step 4: Verify the PNG exists and is 1200×630**

Run (from `frontend/`):

```bash
node -e "import('sharp').then(async s=>{const m=await s.default('public/og-default.png').metadata();console.log(m.width,m.height,m.format)})"
```

Expected: `1200 630 png`

- [ ] **Step 5: Commit**

```bash
git add frontend/public/og-card.svg frontend/scripts/gen-og-image.mjs frontend/public/og-default.png frontend/package.json frontend/package-lock.json
git commit -m "feat(share): add default 1200x630 social card image + generator"
```

---

## Task 2: Static baseline OG tags in index.html

The SPA shell is served for every non-crawler-routed path. Putting real OG tags here fixes the landing page, `/forums`, `/search`, and all auth pages in one shot. Vite substitutes `%VITE_SITE_URL%` at build time, so `og:image` is an absolute URL (Facebook/Twitter reject relative ones).

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/.env`, `frontend/.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add `VITE_SITE_URL` to env files**

In `frontend/.env`, add a line after the existing `FRONTEND_URL=...`:

```
VITE_SITE_URL=http://localhost:5173
```

In `frontend/.env.example`, add:

```
VITE_SITE_URL=your-public-site-url
```

- [ ] **Step 2: Replace the `<head>` of `frontend/index.html`**

Replace lines 3–11 (the `<head>...</head>` block) with:

```html
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">

    <title>IT.Forum — A community for developers</title>
    <meta name="description" content="Ask questions, share knowledge, and grow with a community of developers on IT.Forum.">

    <!-- Open Graph (Facebook, LINE, Discord, Slack) -->
    <meta property="og:site_name" content="IT.Forum">
    <meta property="og:type" content="website">
    <meta property="og:title" content="IT.Forum — A community for developers">
    <meta property="og:description" content="Ask questions, share knowledge, and grow with a community of developers on IT.Forum.">
    <meta property="og:url" content="%VITE_SITE_URL%/">
    <meta property="og:image" content="%VITE_SITE_URL%/og-default.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="IT.Forum — A community for developers">
    <meta name="twitter:description" content="Ask questions, share knowledge, and grow with a community of developers on IT.Forum.">
    <meta name="twitter:image" content="%VITE_SITE_URL%/og-default.png">
  </head>
```

- [ ] **Step 3: Pass the build arg through docker-compose**

In `docker-compose.yml`, under the frontend service `build.args` (alongside `VITE_API_URL` / `VITE_GOOGLE_CLIENT_ID` near line 59), add:

```yaml
        VITE_SITE_URL: ${VITE_SITE_URL}
```

If `frontend/Dockerfile` lists build args explicitly (`ARG VITE_API_URL` etc.), add `ARG VITE_SITE_URL` and `ENV VITE_SITE_URL=$VITE_SITE_URL` next to the others so Vite sees it at build. (Open `frontend/Dockerfile` and mirror the existing `VITE_API_URL` lines.)

- [ ] **Step 4: Build and verify substitution happened**

Run (from `frontend/`):

```bash
npm run build
```

Then check the built shell:

```bash
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');console.log(h.includes('og:image')&&h.includes('og-default.png')?'OK og tags present':'MISSING');console.log(h.includes('%VITE_SITE_URL%')?'FAIL: token not substituted':'OK substituted')"
```

Expected:
```
OK og tags present
OK substituted
```

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/.env.example docker-compose.yml
git commit -m "feat(share): static baseline OG/Twitter tags + VITE_SITE_URL"
```

(`frontend/.env` is typically gitignored — only commit `.env.example`.)

---

## Task 3: Client-side per-route meta (`setPageMeta`)

Updates `document.title` and the og/twitter `<meta>` tags as the user navigates. Helps browser tabs, bookmarks, and JS-executing crawlers (Googlebot renders the SPA). Pure DOM, unit-testable under jsdom.

**Files:**
- Create: `frontend/src/utils/meta.ts`
- Create: `frontend/src/utils/meta.test.ts`
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/views/ThreadDetailView.vue`, `ForumView.vue`, `ProfileView.vue`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/meta.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setPageMeta } from './meta'

function content(selector: string) {
  return document.head.querySelector(selector)?.getAttribute('content')
}

describe('setPageMeta', () => {
  beforeEach(() => {
    document.title = ''
    document.head.innerHTML = ''
  })

  it('sets document.title with the site suffix', () => {
    setPageMeta({ title: 'Hello thread', description: 'desc' })
    expect(document.title).toBe('Hello thread — IT.Forum')
  })

  it('creates og + twitter tags when missing', () => {
    setPageMeta({ title: 'T', description: 'D', image: 'https://x/og.png' })
    expect(content('meta[property="og:title"]')).toBe('T')
    expect(content('meta[property="og:description"]')).toBe('D')
    expect(content('meta[property="og:image"]')).toBe('https://x/og.png')
    expect(content('meta[name="twitter:title"]')).toBe('T')
    expect(content('meta[name="twitter:image"]')).toBe('https://x/og.png')
  })

  it('updates existing tags in place rather than duplicating', () => {
    setPageMeta({ title: 'First', description: 'D1' })
    setPageMeta({ title: 'Second', description: 'D2' })
    expect(document.head.querySelectorAll('meta[property="og:title"]').length).toBe(1)
    expect(content('meta[property="og:title"]')).toBe('Second')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npx vitest run src/utils/meta.test.ts`
Expected: FAIL — `Cannot find module './meta'`.

- [ ] **Step 3: Implement `setPageMeta`**

Create `frontend/src/utils/meta.ts`:

```ts
const SITE_NAME = 'IT.Forum'
// Vite injects this at build; falls back to relative for local dev.
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, '')
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`

export interface PageMeta {
  title: string
  description: string
  image?: string
}

function setTag(attr: 'property' | 'name', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

export function setPageMeta({ title, description, image }: PageMeta) {
  const img = image || DEFAULT_OG_IMAGE
  document.title = `${title} — ${SITE_NAME}`
  setTag('name', 'description', description)
  setTag('property', 'og:title', title)
  setTag('property', 'og:description', description)
  setTag('property', 'og:image', img)
  setTag('name', 'twitter:title', title)
  setTag('name', 'twitter:description', description)
  setTag('name', 'twitter:image', img)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `frontend/`): `npx vitest run src/utils/meta.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire per-route default titles in the router**

In `frontend/src/router/index.ts`, add the import at the top (after the existing imports):

```ts
import { setPageMeta } from '../utils/meta.js'
```

Add a static title map and an `afterEach` hook immediately **before** `export default router` (line 109):

```ts
const ROUTE_META: Record<string, { title: string; description: string }> = {
  landing: { title: 'Home', description: 'A community for developers — ask, share, and grow.' },
  home: { title: 'Forums', description: 'Browse all developer forums on IT.Forum.' },
  search: { title: 'Search', description: 'Search threads and posts across IT.Forum.' },
  login: { title: 'Log in', description: 'Log in to IT.Forum.' },
  register: { title: 'Register', description: 'Create your IT.Forum account.' },
}

// Views with dynamic data (thread, forum, profile) call setPageMeta themselves
// once loaded; this only fills in the static pages.
router.afterEach((to) => {
  const m = ROUTE_META[to.name as string]
  if (m) setPageMeta(m)
})
```

- [ ] **Step 6: Call `setPageMeta` from the dynamic views**

In each view's data-loaded handler (where the thread / forum / profile object becomes available, e.g. inside the `onMounted` fetch `.then` or after `await`), add a `setPageMeta(...)` call. Add the import to each `<script setup>` first:

`frontend/src/views/ThreadDetailView.vue` — after the thread is fetched:

```ts
import { setPageMeta } from '../utils/meta.js'
// ...after the thread loads (thread.value is set):
setPageMeta({
  title: thread.value.title,
  description: thread.value.content.replace(/\s+/g, ' ').trim().slice(0, 200),
})
```

`frontend/src/views/ForumView.vue` — after the forum is fetched:

```ts
import { setPageMeta } from '../utils/meta.js'
// ...after the forum loads:
setPageMeta({
  title: forum.value.name,
  description: forum.value.description ?? `Discussions in ${forum.value.name} on IT.Forum.`,
})
```

`frontend/src/views/ProfileView.vue` — after the user is fetched:

```ts
import { setPageMeta } from '../utils/meta.js'
// ...after the profile user loads:
setPageMeta({
  title: user.value.name,
  description: user.value.bio ?? `${user.value.name}'s profile on IT.Forum.`,
  image: user.value.avatar ?? undefined,
})
```

> Use the actual reactive ref names already present in each view. Open each file and confirm the variable holding the loaded entity (`thread`, `forum`, `user`) and the exact point it resolves before inserting the call.

- [ ] **Step 7: Run the full frontend unit suite + typecheck**

Run (from `frontend/`): `npx vitest run && npm run type-check`
Expected: all tests PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/meta.ts frontend/src/utils/meta.test.ts frontend/src/router/index.ts frontend/src/views/ThreadDetailView.vue frontend/src/views/ForumView.vue frontend/src/views/ProfileView.vue
git commit -m "feat(share): client-side per-route title + og/twitter meta"
```

---

## Task 4: Backend share service — default image, og:type, forum + user cards

**Files:**
- Modify: `backend/src/services/share.service.ts`
- Modify: `backend/src/services/share.service.test.ts`

- [ ] **Step 1: Write failing tests for the new render contract + new methods**

Replace the contents of `backend/src/services/share.service.test.ts` with:

```ts
import { test, expect } from 'bun:test';
import { renderOgHtml } from './share.service.js';

test('renders escaped OG + twitter meta with a redirect', () => {
  const html = renderOgHtml({
    title: 'Hello & <world>',
    description: 'a "quoted" snippet',
    url: 'https://forum.example/thread/abc',
    image: 'https://forum.example/img.png',
  });
  expect(html).toContain('<meta property="og:title" content="Hello &amp; &lt;world&gt;">');
  expect(html).toContain('<meta property="og:url" content="https://forum.example/thread/abc">');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  expect(html).toContain('url=https://forum.example/thread/abc'); // meta refresh redirect
});

test('falls back to the default site card when no image is given', () => {
  const html = renderOgHtml({
    title: 'No image',
    description: 'desc',
    url: 'https://forum.example/forum/xyz',
  });
  // Default image is FRONTEND_URL + /og-default.png; in tests FRONTEND_URL is unset
  // so it resolves to the localhost default.
  expect(html).toContain('og:image');
  expect(html).toContain('/og-default.png');
  expect(html).toContain('<meta name="twitter:image"');
});

test('emits the requested og:type', () => {
  const website = renderOgHtml({ title: 't', description: 'd', url: 'u', type: 'website' });
  expect(website).toContain('<meta property="og:type" content="website">');
  const profile = renderOgHtml({ title: 't', description: 'd', url: 'u', type: 'profile' });
  expect(profile).toContain('<meta property="og:type" content="profile">');
});

test('defaults og:type to article when unspecified', () => {
  const html = renderOgHtml({ title: 't', description: 'd', url: 'u' });
  expect(html).toContain('<meta property="og:type" content="article">');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `bun test src/services/share.service.test.ts`
Expected: FAIL — default-image and og:type assertions fail (current render omits image when absent and hardcodes `og:type=article`).

- [ ] **Step 3: Rewrite `share.service.ts`**

Replace the contents of `backend/src/services/share.service.ts` with:

```ts
import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { userRepository } from '../repositories/user.repository.js';

// FRONTEND_URL may be a comma-separated list of origins; use the first, no trailing slash.
const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')[0]!
  .trim()
  .replace(/\/+$/, '');

// Absolute URL to the default social card. FB/Twitter require absolute og:image URLs.
const DEFAULT_OG_IMAGE = `${FRONTEND_URL}/og-default.png`;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type OgType = 'website' | 'article' | 'profile';

export interface OgMeta {
  title: string;
  description: string;
  url: string;
  image?: string | undefined;
  type?: OgType | undefined;
}

export function renderOgHtml(m: OgMeta): string {
  const image = m.image ?? DEFAULT_OG_IMAGE;
  const type = m.type ?? 'article';
  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(m.title)}</title>
<meta property="og:site_name" content="IT.Forum">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:url" content="${esc(m.url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${m.url}">
</head><body>Redirecting to <a href="${esc(m.url)}">${esc(m.url)}</a></body></html>`;
}

function snippet(content: string, max = 200): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max - 3) + '...' : oneLine;
}

export const shareService = {
  async threadOg(id: string): Promise<string | null> {
    const thread = await threadRepository.findById(id);
    if (!thread) return null;
    const by = thread.author?.name ? ` · by ${thread.author.name}` : '';
    const inForum = thread.forum?.name ? ` in ${thread.forum.name}` : '';
    return renderOgHtml({
      title: thread.title,
      description: `${snippet(thread.content, 160)}${inForum}${by}`,
      url: `${FRONTEND_URL}/thread/${id}`,
      type: 'article',
      // Author avatars are small/square; prefer the proper card. Use the banner
      // if the author set one, else fall back to the default site card.
      image: thread.author?.banner ?? undefined,
    });
  },

  async postOg(id: string): Promise<string | null> {
    const post = await postRepository.findById(id);
    if (!post) return null;
    return renderOgHtml({
      title: 'Reply in thread',
      description: snippet(post.content),
      url: `${FRONTEND_URL}/thread/${post.threadId}#post-${id}`,
      type: 'article',
    });
  },

  async forumOg(id: string): Promise<string | null> {
    const forum = await forumRepository.findById(id);
    if (!forum) return null;
    return renderOgHtml({
      title: `${forum.name} — IT.Forum`,
      description: forum.description
        ? snippet(forum.description)
        : `Discussions in ${forum.name} on IT.Forum.`,
      url: `${FRONTEND_URL}/forum/${id}`,
      type: 'website',
    });
  },

  async userOg(id: string): Promise<string | null> {
    const user = await userRepository.findById(id);
    if (!user) return null;
    return renderOgHtml({
      title: `${user.name} — IT.Forum`,
      description: user.bio ? snippet(user.bio) : `${user.name}'s profile on IT.Forum.`,
      url: `${FRONTEND_URL}/user/${id}`,
      type: 'profile',
      image: user.banner ?? user.avatar ?? undefined,
    });
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run (from `backend/`): `bun test src/services/share.service.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/share.service.ts backend/src/services/share.service.test.ts
git commit -m "feat(share): default card image, og:type, forum + user OG; richer thread text"
```

---

## Task 5: Backend share routes for forum + user

**Files:**
- Modify: `backend/src/routes/share.routes.ts`

- [ ] **Step 1: Add the two routes**

In `backend/src/routes/share.routes.ts`, append two `.get(...)` blocks to the existing `shareRoutes` chain (after the `/post/:id` block, before the closing `;`):

```ts
  .get(
    '/forum/:id',
    async ({ params }) => {
      const out = await shareService.forumOg(params.id);
      return out ? html(out) : new Response('Not found', { status: 404 });
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) },
  )
  .get(
    '/user/:id',
    async ({ params }) => {
      const out = await shareService.userOg(params.id);
      return out ? html(out) : new Response('Not found', { status: 404 });
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) },
  );
```

(Remove the trailing `;` from the previous `/post/:id` block and place it after the new `/user/:id` block so the chain stays one expression.)

- [ ] **Step 2: Verify the routes respond**

Start the backend (from `backend/`): `bun run dev` (or however the dev server starts — check `package.json`).

In another shell, hit the routes with a known forum and user id (grab real ids from the DB or the running SPA):

```bash
curl -s http://localhost:3636/share/forum/<realForumId> | grep -o 'og:title[^>]*'
curl -s http://localhost:3636/share/user/<realUserId> | grep -o 'og:title[^>]*'
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3636/share/forum/does-not-exist
```

Expected: first two print an `og:title` line with the forum/user name; the third prints `404`.

- [ ] **Step 3: Run the backend test suite to confirm nothing regressed**

Run (from `backend/`): `bun test`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/share.routes.ts
git commit -m "feat(share): /share/forum/:id and /share/user/:id endpoints"
```

---

## Task 6: nginx — route forum + user crawler hits

Extend the crawler UA routing so `/forum/:id` and `/user/:id` are server-rendered for crawlers, while humans still get the SPA. Reuses the existing `$is_crawler` map and the variable-`proxy_pass` + `rewrite ... break` pattern already proven in prod (see [forum CUID/sharing notes]).

**Files:**
- Modify: `frontend/nginx.conf`

- [ ] **Step 1: Add two crawler location blocks**

In `frontend/nginx.conf`, after the existing `location ~ ^/thread/([^/#?]+)$ { ... }` block (line 27) and before `location / {`, insert:

```nginx
    # A single-segment forum URL (exclude the /forum/create form route).
    location ~ ^/forum/(?!create$)([^/#?]+)$ {
        set $backend backend:3636;
        if ($is_crawler) {
            rewrite ^/forum/(.*)$ /share/forum/$1 break;
            proxy_pass http://$backend;
        }
        try_files $uri /index.html;
    }

    # User profile URL.
    location ~ ^/user/([^/#?]+)$ {
        set $backend backend:3636;
        if ($is_crawler) {
            rewrite ^/user/(.*)$ /share/user/$1 break;
            proxy_pass http://$backend;
        }
        try_files $uri /index.html;
    }
```

> Note: `/forum/:forum/create-thread` is two segments and won't match the single-segment regex, so it correctly falls through to the SPA. The negative lookahead `(?!create$)` keeps `/forum/create` on the SPA too.

- [ ] **Step 2: Validate nginx config syntax**

Run (from repo root): `docker run --rm -v "${PWD}/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t`
Expected: `... syntax is ok` / `... test is successful`.

(On PowerShell use `${PWD}`; on bash `$(pwd)`.)

- [ ] **Step 3: Commit**

```bash
git add frontend/nginx.conf
git commit -m "feat(share): nginx crawler routing for /forum/:id and /user/:id"
```

---

## Task 7: End-to-end verification (crawler UA simulation)

No code changes — this proves the whole pipeline against a running stack (local docker compose or staging). Do **not** mark the feature done until these pass.

- [ ] **Step 1: Build and bring up the stack**

Run (from repo root): `docker compose up -d --build`
(Ensure `VITE_SITE_URL` is set in the environment / `.env` consumed by compose so the static tags get an absolute image URL.)

- [ ] **Step 2: Landing page baseline (static tags)**

```bash
curl -s http://localhost/ | grep -E 'og:(title|image|url)'
```

Expected: lines for `og:title` (IT.Forum…), `og:image` (…/og-default.png), `og:url`.

- [ ] **Step 3: Thread/forum/user as a crawler**

Replace ids with real ones from the running site:

```bash
UA='facebookexternalhit/1.1'
curl -s -A "$UA" http://localhost/thread/<id> | grep -E 'og:(title|image)'
curl -s -A "$UA" http://localhost/forum/<id>  | grep -E 'og:(title|type)'
curl -s -A "$UA" http://localhost/user/<id>   | grep -E 'og:(title|type)'
```

Expected: each returns server-rendered OG tags with the entity's real title; forum shows `og:type=website`, user shows `og:type=profile`.

- [ ] **Step 4: Same URLs as a human get the SPA shell**

```bash
curl -s http://localhost/forum/<id> | grep -o '<div id="app">'
```

Expected: `<div id="app">` (the SPA shell, not the redirect HTML).

- [ ] **Step 5: Validate the live cards with platform tools (manual)**

Once deployed to a public URL, paste links into:
- Facebook Sharing Debugger — https://developers.facebook.com/tools/debug/
- X/Twitter Card Validator (or post in a draft)
- Discord/LINE/Slack by pasting into a private channel

Confirm title, description, and the 1200×630 thumbnail render. Use the FB debugger "Scrape Again" to bust caches after changes.

- [ ] **Step 6: Final commit (if any doc/notes updated)**

```bash
git add -A
git commit -m "docs(share): verification notes for social metadata"
```

---

## Self-Review

**Spec coverage** (request: link previews with thumbnail + title + description; landing currently has none; plus other pages):
- Landing `/` → Task 2 static OG tags + Task 1 default image. ✅
- "Other pages that also need fixing": `/forums`, `/search`, auth → Task 2 baseline. ✅ Forum `/forum/:id` → Tasks 4–6. ✅ User `/user/:id` → Tasks 4–6. ✅ Thread/post → already existed, improved in Task 4 (default card image, richer text). ✅
- Thumbnail → Task 1 produces a real 1200×630 PNG; every card references it (default or entity image). ✅
- Browser tab titles / Googlebot SPA render → Task 3. ✅

**Placeholder scan:** Real ids are required at run/verify time (Tasks 5, 7) — flagged as "use a real id from the DB," which is a runtime input, not an unwritten code placeholder. The only "fill in the variable name" instructions (Task 3 Step 6) are explicit: open the view and use the existing `thread`/`forum`/`user` ref. No `TODO`/`TBD`/"add error handling" left.

**Type consistency:** `OgMeta` gains optional `type?: OgType` and `renderOgHtml` always emits `og:image` (default fallback) — the existing thread/post calls still satisfy the interface (image optional). `setPageMeta(PageMeta)` signature matches all three view call-sites and the router map. Route `/share/forum/:id` / `/share/user/:id` use `t.String({ minLength: 1 })` exactly like the existing thread/post routes. `forumRepository`/`userRepository` singleton names verified against the repo files.

---

## Notes / Out of Scope (YAGNI)

- **Per-thread generated images** (rendering the thread title onto a card) — deferred; the default card + dynamic title/description already give a good preview. Revisit if engagement data justifies it.
- **`og:image` via the Axite CDN** — user avatars/banners may live on `cdn.supakorn.xyz`; those URLs are passed through as-is. The default card is served from the frontend origin. No CDN work needed here.
- **Sitemap / structured data (JSON-LD)** — separate SEO concern, not part of share previews.
