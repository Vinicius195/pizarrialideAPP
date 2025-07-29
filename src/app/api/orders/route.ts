import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { sendNotification } from '@/lib/fcm';
import type { Order, UserProfile, Notification } from '@/types';

/**
 * Notifica usuários relevantes sobre a criação de um novo pedido.
 * @param order O objeto do novo pedido.
 */
async function notifyNewOrder(order: Order) {
  try {
    const adminSnapshot = await db.collection('users').where('role', '==', 'Administrador').where('status', '==', 'Aprovado').get();
    const staffSnapshot = await db.collection('users').where('role', '==', 'Funcionário').where('status', '==', 'Aprovado').get();

    const usersToNotify: UserProfile[] = [];
    const userIds = new Set<string>();

    adminSnapshot.forEach(doc => {
      if (!userIds.has(doc.id)) {
        userIds.add(doc.id);
        usersToNotify.push({ key: doc.id, ...doc.data() } as UserProfile);
      }
    });
    staffSnapshot.forEach(doc => {
      if (!userIds.has(doc.id)) {
        userIds.add(doc.id);
        usersToNotify.push({ key: doc.id, ...doc.data() } as UserProfile);
      }
    });

    if (usersToNotify.length === 0) {
      console.log('Nenhum usuário para notificar sobre o novo pedido.');
      return;
    }

    const notificationTitle = `🚀 Novo Pedido #${order.orderNumber}`;
    const notificationBody = `Cliente: ${order.customerName} | Total: R$${order.total.toFixed(2)}`;
    const relatedUrl = `/pedidos`;

    // 1. Salvar no Firestore
    const firestorePromises = usersToNotify.map(user => {
      const notificationRef = db.collection('notifications').doc();
      const notificationData: Omit<Notification, 'id'> = {
        userId: user.key,
        title: notificationTitle,
        message: notificationBody,
        relatedUrl,
        read: false,
        timestamp: new Date().toISOString(),
        priority: 'high', // Novo pedido é sempre alta prioridade
      };
      return notificationRef.set(notificationData);
    });

    // 2. Enviar Notificações Push
    const pushPromises = usersToNotify
      .filter(user => user.fcmToken)
      .map(user => sendNotification(user.fcmToken!, {
        title: notificationTitle,
        body: notificationBody,
        click_action: relatedUrl,
      }));

    await Promise.all([...firestorePromises, ...pushPromises]);
    console.log(`[API/Orders] Notificações de novo pedido enviadas para ${usersToNotify.length} usuários.`);

  } catch (error) {
    console.error(`[API/Orders] Falha ao criar notificação de novo pedido para o pedido ${order.id}:`, error);
  }
}

// GET all non-archived orders
export async function GET() {
  try {
    const ordersSnapshot = await db.collection('orders').orderBy('timestamp', 'desc').get();
    const allOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
    const activeOrders = allOrders.filter(order => order.status !== 'Arquivado');
    return NextResponse.json(activeOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST a new order
export async function POST(request: Request) {
  try {
    const orderData: Omit<Order, 'id' | 'orderNumber' | 'status' | 'timestamp'> = await request.json();
    
    const countersRef = db.collection('counters').doc('orders');
    
    const newOrderNumber = await db.runTransaction(async (t) => {
        const doc = await t.get(countersRef);
        const newNum = (doc.data()?.currentNumber || 0) + 1;
        t.set(countersRef, { currentNumber: newNum }, { merge: true });
        return newNum;
    });

    const newOrderRef = db.collection('orders').doc();
    
    const finalOrderData: Order = {
      id: newOrderRef.id,
      ...orderData,
      orderNumber: newOrderNumber,
      status: 'Recebido',
      timestamp: new Date().toISOString(),
    };

    await newOrderRef.set(finalOrderData);
    
    // Chamar a função de notificação refatorada
    await notifyNewOrder(finalOrderData);

    return NextResponse.json(finalOrderData, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
