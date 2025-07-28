import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// This is a protected endpoint. 
// It now ARCHIVES all non-archived orders instead of deleting them.
// It also RESETS the order counter to ensure the next order starts from 1.
export async function DELETE() {
  try {
    const ordersCollection = db.collection('orders');
    const snapshot = await ordersCollection.where('status', '!=', 'Arquivado').get();

    // Reference to the counter document
    const counterRef = db.collection('counters').doc('orders');

    // If there are no active orders, we still might want to reset the counter
    // just in case it's out of sync. So, we proceed anyway.

    const batch = db.batch();
    
    // Archive existing active orders
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'Arquivado' });
    });

    // Reset the counter
    batch.set(counterRef, { currentNumber: 0 });

    await batch.commit();

    // The frontend will interpret 204 as success and refetch data.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error archiving all orders and resetting counter:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
