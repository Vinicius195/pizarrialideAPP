import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Customer } from '@/types';
import { normalizePhoneNumber } from '@/lib/utils';

// GET all customers OR find a specific customer by phone
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const customersCollection = db.collection('customers');

    if (phone) {
      const normalizedPhone = normalizePhoneNumber(phone);
      const querySnapshot = await customersCollection.where('phone', '==', normalizedPhone).limit(1).get();
      
      if (querySnapshot.empty) {
        return new NextResponse(`Customer with phone ${normalizedPhone} not found`, { status: 404 });
      }

      const customerDoc = querySnapshot.docs[0];
      const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
      return NextResponse.json(customer);
    }

    const customersSnapshot = await customersCollection.orderBy('name').get();
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[];
    return NextResponse.json(customers);

  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}

// POST a new customer
export async function POST(request: Request) {
  try {
    const customerData: Omit<Customer, 'id'> = await request.json();
    
    if (!customerData.phone) {
      return new NextResponse('Phone number is required', { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(customerData.phone);

    const existingCustomerQuery = await db.collection('customers').where('phone', '==', normalizedPhone).limit(1).get();
    if (!existingCustomerQuery.empty) {
        const existingCustomer = existingCustomerQuery.docs[0].data() as Customer;
        return new NextResponse(`Customer with phone ${normalizedPhone} already exists with name ${existingCustomer.name}`, { status: 409 });
    }
    
    const finalCustomerData = {
      ...customerData,
      phone: normalizedPhone,
      lastOrderDate: new Date().toISOString(),
    };

    const newCustomerRef = await db.collection('customers').add(finalCustomerData);
    const newCustomer = await newCustomerRef.get();

    return NextResponse.json({ id: newCustomer.id, ...newCustomer.data() }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating customer:", error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
