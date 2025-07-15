import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Customer } from '@/types';

// GET a single customer by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const customerId = params.id;
    const customerDoc = await db.collection('customers').doc(customerId).get();

    if (!customerDoc.exists) {
      return new NextResponse('Customer not found', { status: 404 });
    }

    const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
    return NextResponse.json(customer);
  } catch (error) {
    console.error(`Error fetching customer ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PUT (update) a customer by ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const customerId = params.id;
    const customerData: Partial<Customer> = await request.json();

    await db.collection('customers').doc(customerId).update(customerData);

    return NextResponse.json({ id: customerId, ...customerData });
  } catch (error) {
    console.error(`Error updating customer ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE a customer by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const customerId = params.id;
    await db.collection('customers').doc(customerId).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting customer ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
