// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// --- Step 0: Force Service Worker Activation ---
self.addEventListener('install', (event) => {
  console.log('[SW] New Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] New Service Worker activated.');
  event.waitUntil(self.clients.claim());
});

// --- CORREÇÃO: Lógica para focar em janela existente ---
self.addEventListener('fetch', (event) => {
  // Esta lógica se aplica apenas a navegações, como abrir o PWA.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Tenta encontrar uma janela do cliente já aberta.
          const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          const appWindowClient = clientsArr.find(
            (c) => c.url.startsWith(self.registration.scope) && 'focus' in c
          );
          
          // Se uma janela for encontrada, foque nela.
          if (appWindowClient) {
            await appWindowClient.focus();
            // Retorna um 'Response' vazio para indicar que a navegação foi tratada.
            return new Response('', { status: 204, statusText: 'No Content' });
          }
          
          // Se nenhuma janela for encontrada, continue com a navegação padrão.
          return await fetch(event.request);
        } catch (err) {
          // Em caso de erro, recorra à navegação padrão.
          console.error('[SW] Fetch handler failed:', err);
          return await fetch(event.request);
        }
      })()
    );
  }
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
