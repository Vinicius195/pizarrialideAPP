// /pizarrialideAPP/public/firebase-messaging-sw.js

// --- Firebase Messaging Logic (Modern) ---

// Importa os scripts do Firebase (versão compatível mais recente)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Carrega a configuração do Firebase a partir de uma rota da API.
importScripts('/firebase-config.js');

// Garante que a configuração foi carregada antes de inicializar o Firebase.
if (self.firebaseConfig) {
  // Inicializa o Firebase
  firebase.initializeApp(self.firebaseConfig);

  const messaging = firebase.messaging();

  /**
   * Lida com mensagens recebidas quando o aplicativo está em segundo plano.
   */
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Mensagem recebida em segundo plano:', payload);

    // Extrai a notificação de `payload.notification`
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.icon || '/icons/icon-192x192.png',
      // A URL para abrir ao clicar é enviada em `payload.fcmOptions.link`.
      data: {
        url: payload.fcmOptions.link || '/',
      },
    };

    // Exibe a notificação.
    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  /**
   * Lida com o clique na notificação.
   */
  self.addEventListener('notificationclick', (event) => {
    // Fecha a notificação.
    event.notification.close();

    const urlToOpen = event.notification.data.url;

    // Procura por uma janela existente e a foca; caso contrário, abre uma nova.
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

} else {
  console.error('[SW] Configuração do Firebase não encontrada. O Service Worker não foi inicializado.');
}


// --- PWA Caching Logic (Preserved) ---
const CACHE_NAME = 'pizzaria-app-cache-v6'; // A versão do cache é mantida
const ASSETS_TO_CACHE = [
  '/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deletando cache antigo:', cacheName);
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

    if (!request.url.startsWith('http')) {
        return;
    }

    if (
      request.url.includes('firestore.googleapis.com') ||
      request.url.includes('/api/') ||
      request.url.includes('/firebase-config.js')
    ) {
        return; // Deixa a rede lidar com isso.
    }

    if (request.method !== 'GET') {
        return;
    }

    if (request.mode === 'navigate' || request.destination === 'script' || request.destination === 'style') {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
                    return networkResponse;
                })
                .catch(() => caches.match(request).then(cachedResponse => {
                    return cachedResponse || Response.error();
                }))
        );
        return;
    }

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
