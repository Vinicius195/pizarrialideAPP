// /public/firebase-messaging-sw.js

// Importa os scripts do Firebase (versão compatível para simplicidade no Service Worker)
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
   * Esta função agora lê as informações do payload `data`.
   */
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Mensagem recebida em segundo plano:', payload);

    // CORREÇÃO: Lê o título e o corpo do objeto `data`.
    const notificationTitle = payload.data.title;
    const notificationOptions = {
      body: payload.data.body,
      icon: payload.data.icon || '/icons/icon-192x192.png',
      // Armazena a URL para o evento de clique.
      data: {
        url: payload.data.url || '/',
      },
    };

    // Exibe a notificação para o usuário.
    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  /**
   * Lida com o evento 'notificationclick'.
   * É acionado quando um usuário clica em uma notificação.
   */
  self.addEventListener('notificationclick', (event) => {
    // Fecha a notificação.
    event.notification.close();

    const urlToOpen = event.notification.data.url;

    // Procura por uma janela existente e a foca.
    // Se nenhuma janela for encontrada, abre uma nova.
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clientList) => {
        for (const client of clientList) {
          // Se uma janela com a URL de destino já existir, foque nela.
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Caso contrário, abra uma nova janela.
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });

} else {
  console.error('[SW] Configuração do Firebase não encontrada. O Service Worker não foi inicializado.');
}
