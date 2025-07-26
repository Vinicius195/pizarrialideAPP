
// Step 0: Import necessary scripts
// The Firebase app and messaging scripts are required.
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Step 1: Import the Firebase config from our dynamic route
// This is the cleanest way to get secrets into the service worker in a Next.js environment.
try {
  importScripts('/firebase-config.js');
} catch (e) {
  console.error('Could not import firebase-config.js. Make sure the route exists and is accessible.', e);
}


// Step 2: Initialize Firebase
// We check if the config was successfully loaded before trying to initialize.
if (self.firebaseConfig) {
  try {
    firebase.initializeApp(self.firebaseConfig);
    const messaging = firebase.messaging();

    console.log('[SW] Firebase initialized successfully.');

    // --- Step 3: Handle background messages ---
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Received background message:', payload);

      // Unified way to get notification data from either `notification` or `data` payload
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Nova Notificação';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Você tem uma nova mensagem.',
        icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-512x512.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: payload.data?.tag || 'pizzaria-notification',
        data: {
          url: payload.data?.url || '/', // The URL to open on click
        },
      };

      console.log(`[SW] Showing notification with title: "${notificationTitle}"`);
      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    // --- Step 4: Handle notification click ---
    self.addEventListener('notificationclick', (event) => {
      console.log('[SW] Notification clicked:', event);
      const clickedNotification = event.notification;
      clickedNotification.close();

      const urlToOpen = clickedNotification.data?.url || '/';

      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          // Check if there's already a window open with the target URL
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // If not, open a new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
      );
    });

  } catch (error) {
    console.error('[SW] Error during Firebase initialization or setup:', error);
  }
} else {
  console.error('[SW] Firebase config not found. Initialization failed.');
}

// --- PWA Caching Logic ---
const CACHE_NAME = 'pizzaria-app-cache-v2'; // Incremented cache name to force update
const ASSETS_TO_CACHE = [
  '/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installing.');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activating.');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // --- Smart Cache Strategy ---

    // 1. Ignore API calls and non-GET requests.
    // Let the browser handle these requests as it normally would.
    if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
        return;
    }

    // 2. Network First, then Cache for navigation requests (HTML pages).
    // This ensures users get the latest version of the app's pages.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If the network fails (offline), serve the base page from cache.
                return caches.match('/');
            })
        );
        return;
    }

    // 3. Cache First for static assets (CSS, JS, images).
    // These assets are unlikely to change often, so serving from cache is fast.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            // If the asset is not in the cache, fetch it from the network,
            // then cache it for next time.
            return fetch(event.request).then((networkResponse) => {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            });
        })
    );
});
