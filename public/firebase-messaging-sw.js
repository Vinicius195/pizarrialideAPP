// Step 0: Import necessary scripts
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Step 1: Import the Firebase config
try {
  importScripts('/firebase-config.js');
} catch (e) {
  console.error('Could not import firebase-config.js.', e);
}

// Step 2: Initialize Firebase
if (self.firebaseConfig) {
  try {
    firebase.initializeApp(self.firebaseConfig);
    const messaging = firebase.messaging();
    console.log('[SW] Firebase initialized successfully.');

    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Received background message:', payload);
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Nova Notificação';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Você tem uma nova mensagem.',
        icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-512x512.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: payload.data?.tag || 'pizzaria-notification',
        data: { url: payload.data?.url || '/' },
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    self.addEventListener('notificationclick', (event) => {
      console.log('[SW] Notification clicked:', event);
      event.notification.close();
      const urlToOpen = event.notification.data?.url || '/';
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) return client.focus();
          }
          if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
      );
    });

  } catch (error) {
    console.error('[SW] Error during Firebase initialization:', error);
  }
} else {
  console.error('[SW] Firebase config not found. Initialization failed.');
}

// --- PWA Caching Logic ---
const CACHE_NAME = 'pizzaria-app-cache-v6'; // Incremented version to apply changes
const ASSETS_TO_CACHE = [
  '/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
    console.log('[SW] Installing new version...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new version...');
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
    const { request } = event;

    // Rule 1: Ignore non-HTTP/HTTPS requests (e.g., chrome-extension://)
    if (!request.url.startsWith('http')) {
        return;
    }

    // Rule 2: Ignore all requests to Firebase, your own API, and the Firebase config script.
    // This is crucial for real-time updates, authentication and configuration.
    if (
      request.url.includes('firestore.googleapis.com') ||
      request.url.includes('/api/') ||
      request.url.includes('/firebase-config.js')
    ) {
        return; // Let the network handle it without interception.
    }

    // Rule 3: Ignore all non-GET requests. Caching only applies to GET.
    if (request.method !== 'GET') {
        return;
    }

    // Strategy for app navigation and core assets (JS/CSS): Network First, then Cache
    // This ensures users get the latest version of the app, falling back to cache if offline.
    if (request.mode === 'navigate' || request.destination === 'script' || request.destination === 'style') {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
                    return networkResponse;
                })
                .catch(() => caches.match(request).then(cachedResponse => {
                    // Return the cached response if the network fails
                    return cachedResponse || Response.error();
                }))
        );
        return;
    }

    // Strategy for static assets (images, fonts): Cache First, then Network
    // This provides a fast loading experience for non-critical-assets.
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            return cachedResponse || fetch(request).then(networkResponse => {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
                return networkResponse;
            });
        })
    );
});
