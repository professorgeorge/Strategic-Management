// Strategic Management Certificate Program — Service Worker
// Caches all simulation files for offline use.
// Version bump forces cache refresh when files are updated.

const CACHE_VERSION = 'smcp-v1';
const CACHE_NAME = CACHE_VERSION;

const ASSETS = [
  './index.html',
  './module1.html',
  './module2.html',
  './module3.html',
  './module4.html',
  './module5.html',
  './module6.html',
  './module7.html',
  './module8.html',
  './module9.html',
  './module10.html',
  './module11.html',
  './module12.html',
  './module13.html',
  './module14.html',
  './manifest.json',
  './icon.svg',
];

// ── Install: cache everything up front ────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use individual requests to avoid failing the whole install if one
      // asset is temporarily unavailable during the first install.
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] Could not cache ${url}:`, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for our assets, network-first for CDN scripts ──────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For CDN resources (Babel, React, Google Fonts) use network-first
  // so we don't serve stale versions of external libraries.
  const isExternal = !url.origin.includes(self.location.origin) &&
                     !event.request.url.startsWith(self.location.origin);

  if (isExternal) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For our own files: cache-first, fall back to network.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache a clone of fresh responses
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
