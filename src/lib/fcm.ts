import { messagingAdmin } from './firebase-admin'; // Importar o messagingAdmin

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  click_action?: string; // URL para abrir ao clicar na notificação
}

/**
 * Envia uma notificação para um dispositivo específico usando seu token FCM.
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

  const message = {
    token: token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    webpush: {
      notification: {
        icon: payload.icon || '/icons/icon-192x192.png',
      },
      fcm_options: {
        link: payload.click_action || '/', // Define o link a ser aberto
      },
    },
  };

  try {
    console.log(`[FCM] Enviando notificação para o token: ${token.substring(0, 10)}...`);
    const response = await messagingAdmin.send(message);
    console.log('[FCM] Notificação enviada com sucesso:', response);
    return response;
  } catch (error) {
    console.error('[FCM] Erro ao enviar notificação:', error);
    
    // Correção: Fazer uma verificação de tipo segura no objeto de erro 'unknown'
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code ===
        'messaging/registration-token-not-registered'
    ) {
      console.log(`[FCM] Token inválido ou não registrado: ${token}`);
      // Aqui você poderia, por exemplo, emitir um evento para remover este token do seu banco de dados.
    }
  }
}
