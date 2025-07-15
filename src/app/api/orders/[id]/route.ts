import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { sendNotification } from '@/lib/fcm'; // Importando a função de envio de notificação
import type { Order, UserProfile, UserRole } from '@/types';

// --- Helper para criar e enviar notificações ---
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
        
        // Busca usuários que correspondem às roles e estão aprovados
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
        
        const processPromises: Promise<any>[] = [];

        usersToNotify.forEach(user => {
            // 1. Cria a notificação no banco de dados (como antes)
            const notificationRef = db.collection('notifications').doc();
            processPromises.push(notificationRef.set({
                userId: user.key,
                message,
                relatedUrl: baseRelatedUrl,
                isRead: false,
                timestamp: new Date().toISOString(),
                priority: (event === 'PEDIDO_PRONTO' || event === 'PEDIDO_EDITADO') ? 'high' : 'normal',
            }));

            // 2. Envia a notificação push se o usuário tiver um token FCM
            if (user.fcmToken) {
                const pushPayload = {
                    title: notificationTitle,
                    body: message,
                    click_action: baseRelatedUrl,
                };
                processPromises.push(sendNotification(user.fcmToken, pushPayload));
            }
        });
        
        await Promise.all(processPromises);

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
    } else if (orderUpdateData.items) {
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
