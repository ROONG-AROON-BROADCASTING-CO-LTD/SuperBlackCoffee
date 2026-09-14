const CACHE_NAME = 'sbc-stock-v2';
const CACHE_PREFIX = 'sbc-stock-';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon-192.png'];
const STATIC_DESTINATIONS = new Set(['script', 'style', 'font', 'image']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/'))
    return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  if (!STATIC_DESTINATIONS.has(request.destination)) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          void caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
