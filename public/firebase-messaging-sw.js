// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

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
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // --- Step 3: Handle background messages ---
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', payload);

    // ** ROBUST NOTIFICATION HANDLING **
    // The most reliable way to get data is from the `data` field of the payload.
    // The `notification` field is often handled automatically by the browser on some platforms
    // and may not be available consistently in the background.
    const notificationTitle = payload.data?.title || payload.notification?.title || 'Nova Notificação';
    const notificationOptions = {
      body: payload.data?.body || payload.notification?.body || 'Você tem uma nova mensagem.',
      icon: payload.data?.icon || '/icons/icon-192x192.png',
      // Add other options for better user experience
      badge: '/icons/icon-192x192.png', // An icon for the notification bar
      data: {
        url: payload.data?.url || '/', // URL to open on click
      },
    };

    // The service worker must show a notification to the user.
    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // --- Step 4: Handle notification click ---
  self.addEventListener('notificationclick', (event) => {
    // Close the notification
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    // This looks for an existing window and focuses it.
    // If no window is found, it opens a new one.
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (const c of clientList) {
            if (c.focused) {
              client = c;
            }
          }
          return client.focus();
        }
        return clients.openWindow(urlToOpen);
      })
    );
  });

  console.log('[firebase-messaging-sw.js] Firebase initialized and handlers set up.');
} else {
  console.error('[firebase-messaging-sw.js] Firebase config not found in URL. Initialization failed.');
}
