import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { startOfDay, subDays } from 'date-fns';
import type { Order } from '@/types';

export async function GET() {
  if (!db) {
    return new NextResponse('Server Configuration Error', { status: 500 });
  }

  try {
    const today = startOfDay(new Date());
    const weekData = Array(7).fill(0).map((_, i) => {
        const date = subDays(today, i);
        return {
            date: date.toISOString().split('T')[0],
            revenue: 0,
            name: date.toLocaleDateString('pt-BR', { weekday: 'short' })
        };
    }).reverse();

    const sevenDaysAgo = startOfDay(subDays(today, 6)).toISOString();

    const ordersCollection = db.collection('orders');
    const snapshot = await ordersCollection
        .where('timestamp', '>=', sevenDaysAgo)
        .get();

    snapshot.docs.forEach(doc => {
        const order = doc.data() as Order;
        if (order.status !== 'Cancelado' && order.timestamp) {
            const orderDateStr = new Date(order.timestamp).toISOString().split('T')[0];
            const dayData = weekData.find(d => d.date === orderDateStr);
            if (dayData) {
                dayData.revenue += order.total;
            }
        }
    });

    return NextResponse.json(weekData);

  } catch (error) {
    console.error("Error fetching weekly revenue:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
