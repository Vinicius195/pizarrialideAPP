import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Order, Customer } from '@/types';

// GET the full order history for a specific customer
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const customerId = params.id;
    const customerRef = db.collection('customers').doc(customerId);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return new NextResponse('Customer not found', { status: 404 });
    }

    const customerData = customerDoc.data() as Customer;
    const customerPhone = customerData.phone;

    // A customer might not have a phone number if they were created without one.
    if (!customerPhone) {
        return NextResponse.json([]);
    }

    // Query without ordering to avoid needing a composite index
    const ordersSnapshot = await db.collection('orders')
      .where('customerPhone', '==', customerPhone)
      .get();
      
    let orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];

    // Sort the orders in memory by converting timestamp strings to dates
    orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(orders);

  } catch (error) {
    console.error(`Error fetching history for customer ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
