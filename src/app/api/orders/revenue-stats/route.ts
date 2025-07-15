import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { endOfDay, startOfDay, subDays } from 'date-fns';

// This new endpoint is specifically for calculating daily revenue stats.
export async function GET() {
  if (!db) {
    return new NextResponse('Server Configuration Error', { status: 500 });
  }

  try {
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
    const yesterdayEnd = endOfDay(subDays(now, 1)).toISOString();

    const ordersCollection = db.collection('orders');

    // Fetch today's orders (non-cancelled)
    const todaySnapshot = await ordersCollection
      .where('timestamp', '>=', todayStart)
      .where('timestamp', '<=', todayEnd)
      .get();

    let todayRevenue = 0;
    todaySnapshot.docs.forEach(doc => {
      const order = doc.data();
      if (order.status !== 'Cancelado') {
        todayRevenue += order.total;
      }
    });

    // Fetch yesterday's orders (non-cancelled, includes archived)
    const yesterdaySnapshot = await ordersCollection
      .where('timestamp', '>=', yesterdayStart)
      .where('timestamp', '<=', yesterdayEnd)
      .get();
      
    let yesterdayRevenue = 0;
    yesterdaySnapshot.docs.forEach(doc => {
      const order = doc.data();
      if (order.status !== 'Cancelado') {
        yesterdayRevenue += order.total;
      }
    });

    return NextResponse.json({ todayRevenue, yesterdayRevenue });
  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
