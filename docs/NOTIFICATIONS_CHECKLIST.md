### Checklist para Notificações Push (App Fechado/Segundo Plano)

*   [ ] **Passo 1: Configuração no Firebase Console**
    *   Acessar o projeto no Firebase Console.
    *   Navegar para "Project Settings" > "Cloud Messaging".
    *   Gerar uma "Web push certificate" (chave VAPID) se ainda não existir.

*   [ ] **Passo 2: Criar o Service Worker para Notificações**
    *   Criar um arquivo `public/firebase-messaging-sw.js`. Este arquivo será responsável por receber as notificações quando o app não estiver em foco.

*   [ ] **Passo 3: Lógica no Cliente (Frontend)**
    *   Criar um componente ou hook (`useFcm.ts`) para gerenciar a lógica de notificações.
    *   Implementar a função para solicitar permissão do usuário para receber notificações.
    *   Implementar a função para obter o token de registro do FCM do dispositivo do usuário.
    *   Criar uma função na API (`/api/users/[id]/save-fcm-token`) para salvar o token do usuário no Firestore.
    *   Adicionar um botão na página de "Configurações" para que o usuário possa ativar as notificações.
    *   Configurar um listener para exibir notificações recebidas enquanto o app está aberto (em primeiro plano).

*   [ ] **Passo 4: Lógica no Servidor (Backend)**
    *   Criar uma função reutilizável (`lib/fcm.ts`) para encapsular a lógica de envio de notificações usando o Firebase Admin SDK.
    *   Integrar essa função nas rotas de API relevantes (ex: na rota de atualização de pedidos) para disparar notificações quando eventos importantes ocorrerem.

*   [ ] **Passo 5: Testes**
    *   Realizar um teste de ponta a ponta:
        1.  Ativar as notificações na página de configurações.
        2.  Verificar se o token foi salvo no Firestore.
        3.  Alterar o status de um pedido.
        4.  Verificar se a notificação é recebida com o app em segundo plano e em primeiro plano.
