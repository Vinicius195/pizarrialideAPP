import { useEffect, useState, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase-client';
import { useToast } from './use-toast';

const FCM_TOKEN_STORAGE_KEY = 'fcmToken';

export function useFcm() {
  const { toast } = useToast();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | 'loading'>('loading');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const saveTokenToDb = useCallback(async (userId: string, token: string) => {
    try {
      const storedToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (storedToken === token) {
        console.log('[FCM] Token já está sincronizado.');
        return;
      }

      await fetch(`/api/users/${userId}/save-fcm-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: token }),
      });
      
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      console.log('[FCM] Novo token salvo no DB e no localStorage.');
    } catch (error) {
      console.error('Erro ao salvar o token do FCM:', error);
    }
  }, []);

  const setupFcm = useCallback(async (userId: string) => {
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        throw new Error('Navegador não suporta Service Workers ou não está no ambiente do cliente.');
      }
      
      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) throw new Error('Chave VAPID do Firebase não encontrada.');

      // CORREÇÃO: Registrar o Service Worker da forma limpa, sem parâmetros na URL.
      // O Service Worker agora busca sua própria configuração via `importScripts`.
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      
      await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        setFcmToken(token);
        await saveTokenToDb(userId, token);
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
        description: 'Ocorreu um erro ao tentar ativar as notificações.',
        variant: 'destructive',
      });
    }
  }, [saveTokenToDb, toast]);

  const requestPermissionAndGetToken = useCallback(async (userId: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.error('Este navegador não suporta notificações.');
      return;
    }
    
    if (notificationPermission === 'granted') {
      await setupFcm(userId);
      return;
    }

    if (notificationPermission === 'denied') {
      toast({
        title: 'Permissão de Notificação Bloqueada',
        description: 'Habilite as notificações nas configurações do seu navegador.',
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
  }, [notificationPermission, setupFcm, toast]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Mensagem recebida em primeiro plano: ', payload);
      toast({
        title: payload.data?.title || 'Nova Notificação',
        description: payload.data?.body,
      });
    });

    return () => unsubscribe();
  }, [toast]);

  return { fcmToken, notificationPermission, requestPermissionAndGetToken };
}
