import { messagingAdmin } from './firebase-admin';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  click_action?: string; // URL para abrir ao clicar na notificação
}

/**
 * Envia uma notificação para um dispositivo específico usando seu token FCM.
 * Adota uma abordagem híbrida (notification + data) para máxima compatibilidade.
 *
 * @param token O token de registro do FCM do dispositivo de destino.
 * @param payload O conteúdo da notificação (título, corpo, etc.).
 * @returns Uma promessa que resolve quando a mensagem é enviada.
 */
export async function sendNotification(
  token: string,
  payload: NotificationPayload,
) {
  if (!token) {
    console.warn('[FCM] Token de destino não fornecido. Abortando o envio.');
    return;
  }

  // **CORREÇÃO FINAL:** Adotando a abordagem híbrida para máxima confiabilidade.
  // O objeto `notification` garante a entrega da notificação pelo sistema (fallback).
  // O objeto `data` entrega o controle ao nosso Service Worker para customização e ação de clique.
  const message = {
    token: token,
    notification: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
    },
    data: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      // O Service Worker usará este campo 'url' para o clique.
      // O campo 'click_action' no `notification` é mais usado para webapps legados.
      url: payload.click_action || '/', 
    },
    // Configurações para Web Push
    webpush: {
      fcm_options: {
        // Garante que o clique na notificação abra a URL definida no nosso SW.
        link: payload.click_action || '/',
      },
      headers: {
        // Urgência e TTL (Time To Live) para a notificação.
        Urgency: 'high',
        TTL: '86400', // 24 horas em segundos
      }
    },
  };

  try {
    console.log(`[FCM] Enviando notificação híbrida para o token: ${token.substring(0, 10)}...`);
    const response = await messagingAdmin.send(message);
    console.log('[FCM] Notificação enviada com sucesso:', response);
    return response;
  } catch (error) {
    console.error('[FCM] Erro ao enviar notificação:', error);
    
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code ===
        'messaging/registration-token-not-registered'
    ) {
      console.log(`[FCM] Token inválido ou não registrado: ${token}`);
      // Aqui você poderia implementar a lógica para remover o token do seu DB.
    }
  }
}
