/* Minimal offline shell for PWA */
const CACHE = 'it-forum-shell-v2';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

// HTML shell must never go stale: network-first so a new deploy's index.html
// (with new hashed asset references) is picked up immediately, falling back
// to the cached shell only when offline. Hashed static assets (content
// fingerprinted, immutable) stay cache-first for speed/offline support.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isShell = req.mode === 'navigate' || ASSETS.includes(new URL(req.url).pathname);

  if (isShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (req.url.startsWith(self.location.origin) && res.ok) {
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match('/')),
    ),
  );
});
