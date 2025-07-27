import { messagingAdmin } from './firebase-admin';

/**
 * Define o formato do payload de uma notificação.
 */
interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  click_action?: string;
}

/**
 * Define o formato do objeto de retorno da função `sendNotification`.
 */
interface SendNotificationResult {
  success: boolean;
  error?: 'invalid-token' | 'unknown';
  message?: string;
}

/**
 * Envia uma notificação para um dispositivo específico usando seu token FCM.
 * Esta função utiliza uma abordagem híbrida (notification + data) para garantir
 * a máxima compatibilidade entre dispositivos e estados do aplicativo (primeiro e segundo plano).
 *
 * @param token O token de registro do FCM do dispositivo de destino.
 * @param payload O conteúdo da notificação (título, corpo, URL de clique, etc.).
 * @returns Um objeto `SendNotificationResult` indicando o sucesso ou a causa da falha.
 */
export async function sendNotification(
  token: string,
  payload: NotificationPayload,
): Promise<SendNotificationResult> {
  if (!token) {
    console.warn('[FCM] Token de destino não fornecido. Abortando o envio.');
    return {
      success: false,
      error: 'unknown',
      message: 'Token não fornecido.',
    };
  }

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
      url: payload.click_action || '/',
    },
    webpush: {
      fcm_options: {
        link: payload.click_action || '/',
      },
      headers: {
        Urgency: 'high',
        TTL: '86400', // 24 horas
      },
    },
  };

  try {
    console.log(`[FCM] Enviando notificação para o token: ${token.substring(0, 15)}...`);
    const response = await messagingAdmin.send(message);
    console.log('[FCM] Notificação enviada com sucesso:', response);
    return { success: true };
  } catch (error) {
    console.error('[FCM] Erro detalhado ao enviar notificação:', error);

    // Verifica se o erro é um erro conhecido do Firebase Admin SDK
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const firebaseError = error as { code: string; message: string };
      
      // Se o token for inválido, sinalizamos para que a camada de serviço possa removê-lo.
      if (firebaseError.code === 'messaging/registration-token-not-registered') {
        console.warn(`[FCM] Token não registrado detectado: ${token.substring(0, 15)}...`);
        return {
          success: false,
          error: 'invalid-token',
          message: 'O token FCM não está mais registrado.',
        };
      }
    }

    // Para todos os outros erros, retornamos uma falha genérica.
    return {
      success: false,
      error: 'unknown',
      message: 'Ocorreu um erro desconhecido ao enviar a notificação.',
    };
  }
}
