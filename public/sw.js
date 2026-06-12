const CACHE_NAME = 'music-transposer-studio-v1';
const STATIC_ASSETS = [
  './',
  'index.html',
  'favicon.svg',
  'icons.svg',
  'manifest.json'
];

// Install Event - Pre-cache static shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve from Cache, fetch and cache on miss
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Intercept standard GET requests under origin or Google Fonts
  if (e.request.method !== 'GET' || 
      (!e.request.url.startsWith(self.location.origin) && !e.request.url.startsWith('https://fonts.'))) {
    return;
  }

  // Bypass Vite HMR socket and live dev tools paths
  if (url.pathname.includes('@vite') || 
      url.pathname.includes('node_modules') || 
      url.pathname.includes('chrome-extension') ||
      url.search.includes('import')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache hit, fetch fresh version in background (Stale-While-Revalidate)
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {/* ignore background fetch errors offline */});
        
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || 
            (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        // If offline and browsing html pages, fallback to cached index shell
        if (e.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('index.html');
        }
        throw err;
      });
    })
  );
});
