import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { sendNotification } from '@/lib/fcm';
import type { Order, UserProfile, UserRole, Notification } from '@/types';

/**
 * Envia notificações com base na atualização de um pedido.
 * Centraliza a lógica para diferentes eventos (status alterado, itens editados).
 * @param previousOrder O estado do pedido antes da atualização.
 * @param updatedOrder O estado do pedido após a atualização.
 */
async function notifyOrderUpdate(previousOrder: Order, updatedOrder: Order) {
  let eventType: 'PEDIDO_EDITADO' | 'PEDIDO_PRONTO' | 'PEDIDO_CANCELADO' | 'PEDIDO_ENTREGUE' | null = null;

  // Determina o tipo de evento com base na mudança
  if (updatedOrder.status !== previousOrder.status) {
    switch (updatedOrder.status) {
      case 'Pronto': eventType = 'PEDIDO_PRONTO'; break;
      case 'Entregue': eventType = 'PEDIDO_ENTREGUE'; break;
      case 'Cancelado': eventType = 'PEDIDO_CANCELADO'; break;
    }
  } else if (JSON.stringify(updatedOrder.items) !== JSON.stringify(previousOrder.items)) {
    eventType = 'PEDIDO_EDITADO';
  }

  if (!eventType) return; // Nenhuma notificação necessária

  // Define os parâmetros da notificação com base no evento
  let title = '', body = '', url = '/pedidos', priority: Notification['priority'] = 'normal';
  let targetRoles: UserRole[] = [];

  switch (eventType) {
    case 'PEDIDO_EDITADO':
      title = `✏️ Pedido #${updatedOrder.orderNumber} Modificado`;
      body = 'Os itens ou detalhes foram alterados. Confira as mudanças.';
      url = `/pedidos?open=${updatedOrder.id}`;
      priority = 'high';
      targetRoles = ['Administrador', 'Funcionário'];
      break;
    case 'PEDIDO_PRONTO':
      title = `✅ Pedido #${updatedOrder.orderNumber} Pronto!`;
      body = `Aguardando para ${updatedOrder.orderType === 'entrega' ? 'entrega' : 'retirada'}.`;
      priority = 'high';
      targetRoles = ['Administrador', 'Funcionário'];
      break;
    case 'PEDIDO_CANCELADO':
      title = `❌ Pedido #${updatedOrder.orderNumber} Cancelado`;
      body = 'O pedido foi marcado como cancelado.';
      priority = 'normal';
      targetRoles = ['Administrador', 'Funcionário'];
      break;
    case 'PEDIDO_ENTREGUE':
      title = `🎉 Pedido #${updatedOrder.orderNumber} Entregue!`;
      body = 'O ciclo do pedido foi finalizado com sucesso.';
      url = '/relatorios';
      priority = 'normal';
      targetRoles = ['Administrador']; // Apenas Admins são notificados
      break;
  }

  try {
    const userSnapshots = await Promise.all(
      targetRoles.map(role => db.collection('users').where('role', '==', role).where('status', '==', 'Aprovado').get())
    );

    const usersToNotify: UserProfile[] = [];
    const userIds = new Set<string>();
    userSnapshots.forEach(snapshot => snapshot.forEach(doc => {
      if (!userIds.has(doc.id)) {
        userIds.add(doc.id);
        usersToNotify.push({ key: doc.id, ...doc.data() } as UserProfile);
      }
    }));

    if (usersToNotify.length === 0) return;

    // 1. Salvar no Firestore
    const firestorePromises = usersToNotify.map(user => {
      const notificationRef = db.collection('notifications').doc();
      const notificationData: Omit<Notification, 'id'> = {
        userId: user.key,
        title,
        message: body,
        relatedUrl: url,
        read: false,
        timestamp: new Date().toISOString(),
        priority,
      };
      return notificationRef.set(notificationData);
    });

    // 2. Enviar Notificações Push
    const pushPromises = usersToNotify
      .filter(user => user.fcmToken)
      .map(user => sendNotification(user.fcmToken!, { title, body, click_action: url }));

    await Promise.all([...firestorePromises, ...pushPromises]);
    console.log(`[API/Orders] Notificações para o evento ${eventType} enviadas para ${usersToNotify.length} usuários.`);
  } catch (error) {
    console.error(`[API/Orders] Falha ao enviar notificação para o evento ${eventType} no pedido ${updatedOrder.id}:`, error);
  }
}

// GET a single order by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const orderDoc = await db.collection('orders').doc(params.id).get();
    if (!orderDoc.exists) return new NextResponse('Order not found', { status: 404 });
    return NextResponse.json({ id: orderDoc.id, ...orderDoc.data() } as Order);
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PUT (update) an order by ID
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const orderUpdateData: Partial<Order> = await request.json();
    const orderRef = db.collection('orders').doc(params.id);

    const previousOrderDoc = await orderRef.get();
    if (!previousOrderDoc.exists) return new NextResponse('Order not found', { status: 404 });
    const previousOrder = { id: previousOrderDoc.id, ...previousOrderDoc.data() } as Order;

    await orderRef.update(orderUpdateData);
    
    const updatedOrder = { ...previousOrder, ...orderUpdateData };
    
    // Chamar a função de notificação centralizada
    await notifyOrderUpdate(previousOrder, updatedOrder);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error(`Error updating order ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE an order by ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await db.collection('orders').doc(params.id).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
