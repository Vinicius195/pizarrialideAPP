# ✅ Checklist Definitivo - Implementação do Sistema de Notificações

Este documento serve como um mapa detalhado para a implementação e refatoração do sistema de notificações, garantindo uma arquitetura robusta, escalável e alinhada com as melhores práticas para PWAs na Vercel.

---

### **Fase 1: Backend - A Fundação (Server-Side)**

*O objetivo aqui é criar uma base sólida e centralizada para o envio de todas as notificações.*

- [ ] **1.1: Criar a Ferramenta de Envio (`src/lib/fcm.ts`)**
    - [ ] Definir a `interface NotificationPayload` com: `title`, `body`, e `click_action`.
    - [ ] Criar a função `async function sendNotification(token: string, payload: NotificationPayload)`.
    - [ ] Construir a mensagem FCM no formato **híbrido**:
        - Objeto `notification` com `title` e `body`.
        - Objeto `data` com `title`, `body`, e `url` (derivado de `click_action`).
    - [ ] Configurar `webpush` com `Urgency: 'high'` e `TTL: '86400'` (24 horas).

- [ ] **1.2: Implementar Gatilhos de Notificação (`/api/orders/...`)**
    - [ ] **Rota de Criação (`/api/orders/route.ts`):**
        - [ ] Na função `POST`, chamar `notifyNewOrder(order)`.
        - [ ] `notifyNewOrder` deve buscar Admins/Funcionários, montar o payload e chamar `sendNotification` para cada um.
        - [ ] Salvar a notificação no Firestore para cada usuário.
    - [ ] **Rota de Edição (`/api/orders/[id]/route.ts`):**
        - [ ] Na função `PUT`, chamar `notifyOrderUpdate(previousOrder, updatedOrder)`.
        - [ ] `notifyOrderUpdate` deve usar a matriz de eventos para definir o público, texto, prioridade e URL.
        - [ ] Chamar `sendNotification` e salvar no Firestore.

---

### **Fase 2: Service Worker - O Carteiro**

*O objetivo é garantir que as notificações sejam recebidas e clicáveis mesmo quando o app não está aberto.*

- [ ] **2.1: Configurar o `public/firebase-messaging-sw.js`**
    - [ ] Importar os scripts do Firebase (`app`, `messaging`) e a configuração (`firebase-config.js`).
    - [ ] Inicializar o Firebase App.
    - [ ] Implementar `onBackgroundMessage` para exibir a notificação usando os dados de `payload.data`.
    - [ ] Implementar `notificationclick` para fechar a notificação e abrir a URL de `event.notification.data.url`.

---

### **Fase 3: Frontend - A Experiência do Usuário**

*O objetivo é exibir as notificações em tempo real dentro do app e fornecer alertas sonoros/vibratórios.*

- [ ] **3.1: Refatorar o `user-context.tsx` para Tempo Real**
    - [ ] Remover `setInterval` para buscar notificações.
    - [ ] Adicionar `useEffect` que cria um `onSnapshot` listener para a coleção `notifications`, filtrando pelo `userId` do usuário logado.
    - [ ] O listener deve atualizar um estado `notifications` no contexto.
    - [ ] Um segundo `useEffect` deve observar o estado `notifications` e disparar o som/vibração para novas notificações não lidas.

- [ ] **3.2: Simplificar o `NotificationBell.tsx`**
    - [ ] O componente deve consumir `notifications` do `useUser()` e renderizar a lista.
    - [ ] Implementar a lógica de `onClick` no "sininho" para marcar as notificações como lidas.

- [ ] **3.3: Criar a API para Marcar Notificações como Lidas (`/api/notifications/route.ts`)**
    - [ ] Implementar um método `PUT` que recebe um array de IDs de notificação e atualiza o campo `read: true` no Firestore.
