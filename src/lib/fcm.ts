import { messagingAdmin, db as firestoreAdmin } from './firebase-admin';

/**
 * Define a estrutura do payload para uma notificação.
 * A `click_action` é a URL para a qual o usuário será redirecionado.
 */
export interface NotificationPayload {
  title: string;
  body: string;
  click_action: string; // URL de destino
}

/**
 * Remove um token FCM inválido do Firestore.
 * @param token O token FCM que não é mais válido.
 */
async function removeInvalidTokenFromFirestore(token: string) {
  try {
    console.log(`[FCM] Iniciando a remoção do token inválido: ${token.substring(0, 15)}...`);
    // Busca na coleção 'users' por documentos que contenham o token inválido.
    const usersQuery = firestoreAdmin.collection('users').where('fcmToken', '==', token);
    const querySnapshot = await usersQuery.get();

    if (querySnapshot.empty) {
      console.log('[FCM] Nenhum usuário encontrado com o token especificado.');
      return;
    }

    // Itera sobre os documentos encontrados e remove o campo 'fcmToken'.
    const batch = firestoreAdmin.batch();
    querySnapshot.forEach(doc => {
      console.log(`[FCM] Removendo token do usuário: ${doc.id}`);
      batch.update(doc.ref, { fcmToken: '' }); // Ou `admin.firestore.FieldValue.delete()`
    });

    await batch.commit();
    console.log('[FCM] Token(s) inválido(s) removido(s) com sucesso do Firestore.');

  } catch (error) {
    console.error('[FCM] Erro ao tentar remover o token inválido do Firestore:', error);
  }
}

/**
 * Envia uma notificação push para um dispositivo específico usando seu token FCM.
 * Adota uma abordagem "data-only" para dar controle total ao Service Worker.
 *
 * @param token O token de registro do FCM do dispositivo de destino.
 * @param payload O conteúdo da notificação (título, corpo, URL).
 * @returns Uma promessa que resolve quando a mensagem é enviada.
 */
export async function sendNotification(
  token: string,
  payload: NotificationPayload,
) {
  if (!token) {
    console.warn('[FCM] Token de destino não fornecido. Abortando o envio da notificação.');
    return;
  }

  // O objeto `data` entrega o controle total ao nosso Service Worker.
  // O SW será o único responsável por exibir a notificação.
  const data = {
    title: payload.title,
    body: payload.body,
    icon: '/icons/icon-192x192.png',
    url: payload.click_action, // O Service Worker usará este campo.
  };

  // Configurações avançadas para Web Push que melhoram a entrega e a experiência.
  const webpushConfig = {
    notification: {
      icon: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200],
    },
    fcm_options: {
      link: payload.click_action,
    },
    headers: {
      Urgency: 'high',
      TTL: '86400', // 24 horas em segundos
    },
  };

  try {
    // Enviando apenas com `data` e `webpush` para evitar duplicidade.
    const response = await messagingAdmin.send({
      token,
      data,
      webpush: webpushConfig,
    });
    console.log(`[FCM] Notificação enviada com sucesso para o token: ${token.substring(0, 15)}...`, response);
  } catch (error: any) {
    console.error(`[FCM] Erro ao enviar notificação para o token: ${token}`, error);
    // Se o token não é mais válido, ele deve ser removido do banco de dados.
    if (error.code === 'messaging/registration-token-not-registered') {
      console.log(`[FCM] Token inválido detectado. Iniciando remoção do Firestore.`);
      await removeInvalidTokenFromFirestore(token);
    }
  }
}
