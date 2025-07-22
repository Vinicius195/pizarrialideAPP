'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Firebase Service Worker registrado com sucesso:', registration);
        }).catch((error) => {
          console.error('Erro ao registrar o Firebase Service Worker:', error);
        });
    }
  }, []);

  return null; // Este componente não renderiza nada visível
}
