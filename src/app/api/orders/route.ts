import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Order, UserProfile } from '@/types';

// --- Reusable Notification Function (Corrected Priority Logic) ---
async function createNewOrderNotification(order: Order) {
    try {
        const adminSnapshot = await db.collection('users').where('role', '==', 'Administrador').where('status', '==', 'Aprovado').get();
        const staffSnapshot = await db.collection('users').where('role', '==', 'Funcionário').where('status', '==', 'Aprovado').get();

        const usersToNotify: UserProfile[] = [];
        const userIds = new Set<string>();
        adminSnapshot.forEach(doc => { if (!userIds.has(doc.id)) { userIds.add(doc.id); usersToNotify.push({ key: doc.id, ...doc.data() } as UserProfile); } });
        staffSnapshot.forEach(doc => { if (!userIds.has(doc.id)) { userIds.add(doc.id); usersToNotify.push({ key: doc.id, ...doc.data() } as UserProfile); } });

        if (usersToNotify.length === 0) return;

        const message = `🚀 Novo pedido #${order.orderNumber} recebido de ${order.customerName}.`;
        const relatedUrl = `/pedidos`;

        const notificationPromises = usersToNotify.map(user => {
            const notificationRef = db.collection('notifications').doc();
            // --- CORRECTED DYNAMIC PRIORITY LOGIC ---
            const priority = user.role === 'Administrador' ? 'high' : 'normal';
            
            return notificationRef.set({
                userId: user.key, message, relatedUrl, isRead: false,
                timestamp: new Date().toISOString(), priority
            });
        });

        await Promise.all(notificationPromises);

    } catch (error) {
        console.error(`Failed to create new order notification for order ${order.id}:`, error);
    }
}


// GET all non-archived orders
export async function GET() {
  if (!db) { return new NextResponse('Server Configuration Error', { status: 500 }); }
  try {
    const ordersSnapshot = await db.collection('orders').orderBy('timestamp', 'desc').get();
    const allOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
    const activeOrders = allOrders.filter(order => order.status !== 'Arquivado');
    return NextResponse.json(activeOrders);
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST a new order
export async function POST(request: Request) {
  if (!db) { return new NextResponse('Server Configuration Error', { status: 500 }); }
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
      id: newOrderRef.id, ...orderData, orderNumber: newOrderNumber,
      status: 'Recebido', timestamp: new Date().toISOString(),
    };

    await newOrderRef.set(finalOrderData);
    await createNewOrderNotification(finalOrderData);

    return NextResponse.json(finalOrderData, { status: 201 });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
