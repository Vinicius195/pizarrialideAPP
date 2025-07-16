// Importa os scripts necessários do Firebase.
// O Firebase gerencia o cache e a atualização desses scripts.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Suas credenciais do Firebase, obtidas do .env.local.
// Atenção: Estes valores são públicos e precisam ser substituídos pelos seus.
const firebaseConfig = {
  apiKey: self.location.search.split('apiKey=')[1].split('&')[0],
  authDomain: self.location.search.split('authDomain=')[1].split('&')[0],
  projectId: self.location.search.split('projectId=')[1].split('&')[0],
  storageBucket: self.location.search.split('storageBucket=')[1].split('&')[0],
  messagingSenderId: self.location.search.split('messagingSenderId=')[1].split('&')[0],
  appId: self.location.search.split('appId=')[1].split('&')[0],
};

// Inicializa o app Firebase no Service Worker.
firebase.initializeApp(firebaseConfig);

// Obtém uma instância do Firebase Messaging.
const messaging = firebase.messaging();

// Adiciona um manipulador de eventos para mensagens recebidas em segundo plano.
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload,
  );

  // Extrai o título e o corpo da notificação dos dados recebidos.
  const notificationTitle = payload.notification.title || 'Nova Notificação';
  const notificationOptions = {
    body: payload.notification.body || 'Você tem uma nova mensagem.',
    icon: payload.notification.icon || '/icons/icon-192x192.png',
    vibrate: [100, 50, 100], // Adiciona um padrão de vibração
  };

  // Exibe a notificação para o usuário.
  self.registration.showNotification(notificationTitle, notificationOptions);
});
