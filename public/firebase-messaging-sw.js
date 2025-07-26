// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const CACHE_NAME = 'pizzaria-app-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.webmanifest'
];

// --- Step 0: Force Service Worker Activation & Cache App Shell ---
self.addEventListener('install', (event) => {
  console.log('[SW] New Service Worker installing.');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] New Service Worker activated.');
  // Limpa caches antigos
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

// --- CORREÇÃO: Lógica para focar em janela existente e servir do cache ---
self.addEventListener('fetch', (event) => {
  // Lógica para focar a janela existente do PWA
  if (event.request.mode === 'navigate' && event.request.method === 'GET') {
      event.respondWith(
          (async () => {
              const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
              const appWindowClient = clientsArr.find(
                  (c) => c.url.startsWith(self.registration.scope) && 'focus' in c
              );

              if (appWindowClient) {
                  await appWindowClient.focus();
                  // Como a janela já está aberta, servimos a página principal do cache.
                  const cachedResponse = await caches.match('/');
                  if (cachedResponse) return cachedResponse;
              }

              // Se nenhuma janela for encontrada, ou o cache falhar, recorra à rede.
              try {
                  const networkResponse = await fetch(event.request);
                  // Clona a resposta para poder colocar no cache e retornar ao mesmo tempo
                  const responseToCache = networkResponse.clone();
                  const cache = await caches.open(CACHE_NAME);
                  // Cacheia a página principal para acesso offline
                  if (event.request.url === self.registration.scope) {
                    cache.put('/', responseToCache);
                  }
                  return networkResponse;
              } catch (error) {
                  console.error('[SW] Fetch failed; returning offline page from cache.');
                  return await caches.match('/');
              }
          })()
      );
      return;
  }

  // Estratégia Cache-First para outros recursos (imagens, etc.)
  event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
          // Se o recurso estiver no cache, retorna ele
          if (cachedResponse) {
              return cachedResponse;
          }
          // Se não, busca na rede, clona, cacheia e retorna
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


// --- Step 1: Get the Firebase configuration from the URL ---
const urlParams = new URL(self.location).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('messagingSenderId'),
  appId: urlParams.get('appId'),
};

// --- Step 2: Initialize Firebase ---
if (firebaseConfig.apiKey) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // --- Step 3: Handle background messages ---
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background message received:', payload);

      const { title, body, icon, url, tag } = payload.data || {};

      if (!title) {
        console.error("[SW] No title found in message data. Can't show notification.");
        return;
      }

      const notificationTitle = title;
      const notificationOptions = {
        body: body || 'Você tem uma nova mensagem.',
        icon: icon || '/icons/icon-512x512.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: tag || 'pizzaria-notificacao',
        actions: [ { action: 'open_url', title: 'Ver Detalhes' } ],
        data: { url: url || '/' },
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
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
      );
    });

    console.log('[SW] Firebase initialized and handlers set up.');

  } catch (error) {
    console.error('[SW] Error during Firebase initialization or setup:', error);
  }
} else {
  console.error('[SW] Firebase config not found in URL. Initialization failed.');
}
