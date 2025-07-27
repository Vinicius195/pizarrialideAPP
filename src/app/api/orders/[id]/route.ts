import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendNotification } from '@/lib/fcm'; // 1. Importar nossa nova função
import type { Order, UserProfile, UserRole } from '@/types';

// --- Helper REUTILIZÁVEL para criar e enviar notificações ---
async function createAndSendOrderNotification(
  event: 'PEDIDO_EDITADO' | 'PEDIDO_PRONTO' | 'PEDIDO_CANCELADO' | 'PEDIDO_ENTREGUE',
  order: Order,
) {
  try {
    let message = '';
    let targetRoles: UserRole[] = [];
    let baseRelatedUrl = '/pedidos';
    let notificationTitle = 'Atualização do Pedido';

    switch (event) {
      case 'PEDIDO_EDITADO':
        targetRoles = ['Administrador', 'Funcionário'];
        notificationTitle = 'Pedido Modificado';
        message = `✏️ O pedido #${order.orderNumber} foi alterado.`;
        baseRelatedUrl = `/pedidos?open=${order.id}`;
        break;
      case 'PEDIDO_PRONTO':
        targetRoles = ['Administrador', 'Funcionário'];
        notificationTitle = 'Pedido Pronto!';
        const deliveryType = order.orderType === 'entrega' ? 'para ENTREGA' : 'para RETIRADA';
        message = `✅ Pedido #${order.orderNumber} está PRONTO ${deliveryType}!`;
        break;
      case 'PEDIDO_CANCELADO':
        targetRoles = ['Administrador', 'Funcionário'];
        notificationTitle = 'Pedido Cancelado';
        message = `❌ O pedido #${order.orderNumber} foi cancelado.`;
        break;
      case 'PEDIDO_ENTREGUE':
        targetRoles = ['Administrador'];
        notificationTitle = 'Pedido Entregue';
        message = `🎉 Pedido #${order.orderNumber} foi marcado como ENTREGUE.`;
        break;
    }

    if (targetRoles.length === 0) return;

    const userSnapshots = await Promise.all(
      targetRoles.map(role =>
        db.collection('users').where('role', '==', role).where('status', '==', 'Aprovado').get()
      )
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

    // --- Lógica de Notificação no Firestore (In-App) ---
    const firestorePromises = usersToNotify.map(user => {
      const notificationRef = db.collection('notifications').doc();
      return notificationRef.set({
        userId: user.key,
        message: message,
        relatedUrl: baseRelatedUrl,
        isRead: false,
        timestamp: new Date().toISOString(),
        priority: (event === 'PEDIDO_PRONTO' || event === 'PEDIDO_EDITADO') ? 'high' : 'normal',
      });
    });

    // --- Lógica de Notificação Push (FCM) com limpeza de token ---
    const pushNotificationPromises = usersToNotify
      .filter(user => user.fcmToken) // Filtrar apenas usuários que têm um token FCM
      .map(async (user) => {
        const payload = {
          title: notificationTitle,
          body: message,
          click_action: baseRelatedUrl,
        };

        // 2. Usar a nova função `sendNotification`
        const result = await sendNotification(user.fcmToken!, payload);

        // 3. Implementar a lógica de limpeza de token
        if (!result.success && result.error === 'invalid-token') {
          console.log(`[Token Cleanup] Removendo token inválido do usuário: ${user.key}`);
          const userRef = db.collection('users').doc(user.key);
          // Usa FieldValue.delete() para remover o campo do documento
          await userRef.update({ fcmToken: FieldValue.delete() });
        }
      });

    await Promise.all([...firestorePromises, ...pushNotificationPromises]);
    console.log(`Notificações para o evento ${event} enviadas com sucesso.`);

  } catch (error) {
    console.error(`Falha ao criar/enviar notificação para o evento ${event} no pedido ${order.id}:`, error);
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

    if (orderUpdateData.status && orderUpdateData.status !== previousOrder.status) {
      switch (orderUpdateData.status) {
        case 'Pronto': await createAndSendOrderNotification('PEDIDO_PRONTO', updatedOrder); break;
        case 'Entregue': await createAndSendOrderNotification('PEDIDO_ENTREGUE', updatedOrder); break;
        case 'Cancelado': await createAndSendOrderNotification('PEDIDO_CANCELADO', updatedOrder); break;
      }
    } else if (orderUpdateData.items && JSON.stringify(orderUpdateData.items) !== JSON.stringify(previousOrder.items)) {
      await createAndSendOrderNotification('PEDIDO_EDITADO', updatedOrder);
    }

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
