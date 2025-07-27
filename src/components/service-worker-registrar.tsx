'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast'; // Usaremos o sistema de toast para notificar

const ServiceWorkerRegistrar = () => {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/firebase-messaging-sw.js')
          .then((registration) => {
            console.log('Service Worker registrado com sucesso:', registration.scope);
            
            // Opcional: Notificar o usuário que o app agora funciona offline
            // e pode receber notificações. Isso só aparece uma vez.
            const isNewInstall = registration.installing;
            if (isNewInstall) {
               toast({
                title: "Aplicativo pronto!",
                description: "O app agora funciona offline e está pronto para receber notificações.",
              });
            }
          })
          .catch((error) => {
            console.error('Falha ao registrar o Service Worker:', error);
            toast({
              title: "Erro de Instalação",
              description: "Não foi possível habilitar as funções offline. Tente recarregar a página.",
              variant: 'destructive',
            });
          });
      });
    }
  }, [toast]); // Adicionado toast como dependência do useEffect

  return null; // Este componente não renderiza nada na tela
};

export default ServiceWorkerRegistrar;
