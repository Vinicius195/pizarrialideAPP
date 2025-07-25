import { NextResponse } from 'next/server';
import { db, messagingAdmin } from '@/lib/firebase-admin';
import type { Order, UserProfile, OrderItem } from '@/types';
import { Message } from 'firebase-admin/messaging';

// --- Reusable Notification Function (Now with Push Notifications) ---
async function createNewOrderNotification(order: Order) {
  try {
    const adminSnapshot = await db.collection('users').where('role', '==', 'Administrador').where('status', '==', 'Aprovado').get();
    const staffSnapshot = await db.collection('users').where('role', '==', 'Funcionário').where('status', '==', 'Aprovado').get();

    const usersToNotify: UserProfile[] = [];
    const userIds = new Set<string>();
    adminSnapshot.forEach(doc => { if (!userIds.has(doc.id)) { userIds.add(doc.id); usersToNotify.push({ key: doc.id, ...doc.data() } as UserProfile); } });
    staffSnapshot.forEach(doc => { if (!userIds.has(doc.id)) { userIds.add(doc.id); usersToNotify.push({ key: doc.id, ...doc.data() } as UserProfile); } });

    if (usersToNotify.length === 0) return;

    const notificationTitle = `🚀 Novo Pedido #${order.orderNumber}`;
    const notificationBody = `Cliente: ${order.customerName} | Total: R$${order.total.toFixed(2)}`;
    const relatedUrl = `/pedidos`;
    const iconUrl = '/icons/icon-512x512.png';

    const firestorePromises = usersToNotify.map(user => {
      const notificationRef = db.collection('notifications').doc();
      const priority = user.role === 'Administrador' ? 'high' : 'normal';
      
      return notificationRef.set({
        userId: user.key,
        message: `${notificationTitle} - ${notificationBody}`,
        relatedUrl,
        isRead: false,
        timestamp: new Date().toISOString(),
        priority
      });
    });

    // CORRECTED: Payload now includes a `data` field for robustness
    const pushNotificationPayload: Message = {
      notification: { title: notificationTitle, body: notificationBody },
      webpush: {
        fcmOptions: { link: relatedUrl },
        notification: {
          title: notificationTitle,
          body: notificationBody,
          icon: iconUrl,
          vibrate: [200, 100, 200],
          actions: [{ action: "open_url", title: "Ver Pedido" }]
        }
      },
      // The `data` field is the most reliable way to send info to the service worker.
      data: {
        title: notificationTitle,
        body: notificationBody,
        icon: iconUrl,
        url: relatedUrl
      },
      topic: '' 
    };

    const pushPromises = usersToNotify
      .filter(user => user.fcmToken)
      .map(user => messagingAdmin.send({ ...pushNotificationPayload, token: user.fcmToken! }));

    await Promise.all([...firestorePromises, ...pushPromises]);
    console.log(`Successfully sent ${pushPromises.length} push notifications.`);

  } catch (error) {
    console.error(`Failed to create new order notification for order ${order.id}:`, error);
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
    
    await createNewOrderNotification(finalOrderData);

    return NextResponse.json(finalOrderData, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
