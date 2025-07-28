import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { endOfDay, startOfDay, subDays } from 'date-fns';

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

    // Helper function to calculate revenue with specific status exclusions
    const calculateRevenue = async (start: string, end: string, excludedStatuses: string[]) => {
      const snapshot = await ordersCollection
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end)
        .get();

      let totalRevenue = 0;
      snapshot.forEach(doc => {
        const order = doc.data();
        if (!excludedStatuses.includes(order.status)) {
          totalRevenue += order.total;
        }
      });
      return totalRevenue;
    };

    // Today's revenue should not include Cancelled or Archived orders
    const todayPromise = calculateRevenue(todayStart, todayEnd, ['Cancelado', 'Arquivado']);

    // Yesterday's revenue should include Archived but not Cancelled orders
    const yesterdayPromise = calculateRevenue(yesterdayStart, yesterdayEnd, ['Cancelado']);

    const [todayRevenue, yesterdayRevenue] = await Promise.all([
      todayPromise,
      yesterdayPromise,
    ]);

    return NextResponse.json({ todayRevenue, yesterdayRevenue });
  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
