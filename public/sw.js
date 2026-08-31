/* global workbox */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Load Workbox from CDN (no build-step dependency)
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js'
);

if (self.workbox) {
  const { registerRoute } = workbox.routing;
  const { CacheFirst, StaleWhileRevalidate } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;

  // Heuristic: cache thumbnails (paths or query markers containing 'thumb' or 'thumbnail')
  const isThumb = ({ url }) =>
    url.origin === self.location.origin &&
    (/thumb/i.test(url.pathname) ||
      /thumbnail/i.test(url.pathname) ||
      url.searchParams?.get?.('variant') === 'thumb');

  // Heuristic: cache "display"/medium images
  const isDisplay = ({ url }) =>
    url.origin === self.location.origin &&
    (/display/i.test(url.pathname) ||
      url.searchParams?.get?.('variant') === 'display');

  registerRoute(
    isThumb,
    new StaleWhileRevalidate({
      cacheName: 'img-thumbs',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 2000,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );

  registerRoute(
    isDisplay,
    new CacheFirst({
      cacheName: 'img-display',
      plugins: [
        new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );
}
