/*
 * SBJ Foods and Drinks — service worker.
 *
 * Two jobs, deliberately no more:
 *
 *   1. Receive pushes about an order and show them on the lock screen.
 *   2. Serve the app shell offline so a tap on the home-screen icon opens
 *      something, even underground.
 *
 * It does NOT cache API responses. A menu, a price or an order status served
 * from a stale cache is worse than an error — someone could order a dish that
 * sold out an hour ago.
 */

const VERSION = 'sbj-v1';
const SHELL = `${VERSION}-shell`;

/// Enough to render the frame and say something useful when offline.
const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/brand/sbj-logo.jpg',
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // One bad URL must not fail the whole install, so they are added
      // individually and failures swallowed.
      .then((cache) =>
        Promise.all(
          SHELL_URLS.map((url) => cache.add(url).catch(() => undefined)),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sbj-') && key !== SHELL)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never touch the API or the websocket — always live.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/realtime')) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, falling back to the cached shell. A SPA route
  // that was never visited still resolves, because the shell renders it.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // Static assets: cache first, then fill the cache behind the request.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request)
          .then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(SHELL).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached ?? Response.error()),
    ),
  );
});

/* ------------------------------------------------------------------ push */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'SBJ Foods and Drinks', body: event.data?.text() ?? '' };
  }

  const title = data.title || 'SBJ Foods and Drinks';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // Tagging by order means a later update replaces the earlier one
      // instead of stacking four notifications for one meal.
      tag: data.tag || 'sbj-order',
      renotify: true,
      data: { url: data.url || '/' },
      vibrate: [80, 40, 80],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus a tab that is already on this order rather than opening a
        // second copy of the app.
        for (const client of clients) {
          if (client.url.includes(target) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.length > 0 && 'navigate' in clients[0]) {
          return clients[0].focus().then((c) => c.navigate(target));
        }
        return self.clients.openWindow(target);
      }),
  );
});
