// Name of the cache
const CACHE_NAME = 'my-pwa-cache-v1';

// Files to cache immediately
const urlsToCache = [
  '/',
  '/index.html',
  // Add other critical assets here like CSS or images
  // '/styles.css',
  // '/logo.png'
];

// Install the Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch resources: Try network first, fall back to cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
