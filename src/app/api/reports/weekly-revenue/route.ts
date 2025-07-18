import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { startOfDay, subDays, endOfDay } from 'date-fns';
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
            date: date.toISOString().split('T')[0], // YYYY-MM-DD for matching
            revenue: 0,
            name: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
        };
    }).reverse();

    const sevenDaysAgo = startOfDay(subDays(today, 6)).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    const ordersCollection = db.collection('orders');
    // Fetch all orders from the last 7 days
    const snapshot = await ordersCollection
        .where('timestamp', '>=', sevenDaysAgo)
        .where('timestamp', '<=', todayEnd)
        .get();

    snapshot.forEach(doc => {
        const order = doc.data() as Order;
        // Only exclude "Cancelled" orders from revenue calculation.
        // Any other status is considered valid for revenue.
        if (order.status !== 'Cancelado' && order.timestamp) {
            const orderDate = new Date(order.timestamp).toISOString().split('T')[0];
            const dayData = weekData.find(d => d.date === orderDate);
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
