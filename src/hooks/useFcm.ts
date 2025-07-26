import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase-client'; // Importa a instância do app Firebase
import { useToast } from './use-toast';

// Hook personalizado para gerenciar o Firebase Cloud Messaging
export function useFcm() {
  const { toast } = useToast();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | 'loading'>('loading');

  useEffect(() => {
    // Define o estado inicial da permissão de notificação.
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Lógica para solicitar permissão e obter o token.
  const requestPermissionAndGetToken = async (userId: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.error('Este navegador não suporta notificações.');
      return;
    }

    if (Notification.permission === 'granted') {
      await setupFcm(userId);
      return;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: 'Permissão de Notificação Bloqueada',
        description:
          'Por favor, habilite as notificações nas configurações do seu navegador.',
        variant: 'destructive',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      await setupFcm(userId);
    } else {
      toast({
        title: 'Permissão de Notificação Negada',
        description: 'Você não receberá notificações sobre seus pedidos.',
        variant: 'default',
      });
    }
  };

  // Configura o FCM, obtém e salva o token.
  const setupFcm = async (userId: string) => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers não são suportados neste navegador.');
      }
      
      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        throw new Error('Chave VAPID do Firebase não encontrada.');
      }

      const swUrl = `/firebase-messaging-sw.js?apiKey=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}&authDomain=${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}&projectId=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}&storageBucket=${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}&messagingSenderId=${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}&appId=${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}`;
      
      // **CORREÇÃO**: Força a atualização e ativação do Service Worker
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
        updateViaCache: 'none', // Busca sempre a versão mais recente
      });

      // Se houver um novo SW esperando para ser ativado
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Garante que o SW esteja ativo antes de obter o token
      await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        setFcmToken(token);
        await saveTokenToDb(userId, token);
        toast({
          title: 'Notificações Ativadas!',
          description: 'Você agora receberá atualizações importantes.',
        });
      } else {
        console.warn('Não foi possível obter o token do FCM.');
        toast({
          title: 'Erro ao Ativar Notificações',
          description: 'Não foi possível obter o token de notificação.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao configurar o FCM:', error);
      toast({
        title: 'Erro de Notificação',
        description:
          'Ocorreu um erro ao tentar ativar as notificações. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Função para salvar o token no banco de dados através da nossa API.
  const saveTokenToDb = async (userId: string, token: string) => {
    try {
      await fetch(`/api/users/${userId}/save-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcmToken: token }),
      });
    } catch (error) {
      console.error('Erro ao salvar o token do FCM:', error);
    }
  };

  // Efeito para configurar o listener de mensagens em primeiro plano.
  useEffect(() => {
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Mensagem recebida em primeiro plano: ', payload);
      toast({
        title: payload.data?.title || 'Nova Notificação',
        description: payload.data?.body,
      });
    });

    return () => {
      unsubscribe(); // Limpa o listener ao desmontar o componente.
    };
  }, [toast]);

  return { fcmToken, notificationPermission, requestPermissionAndGetToken };
}
