import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Customer } from '@/types';

// GET all customers OR find a specific customer by phone
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const customersCollection = db.collection('customers');

    // If a phone number is provided, search for that specific customer
    if (phone) {
      const querySnapshot = await customersCollection.where('phone', '==', phone).limit(1).get();
      if (querySnapshot.empty) {
        // Return a specific not-found response for the search
        return new NextResponse('Customer not found', { status: 404 });
      }
      const customerDoc = querySnapshot.docs[0];
      const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
      return NextResponse.json(customer);
    }

    // If no phone number is provided, return all customers
    const customersSnapshot = await customersCollection.orderBy('name').get();
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Customer[];
    return NextResponse.json(customers);

  } catch (error) {
    console.error("Error fetching customers:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


// POST a new customer
export async function POST(request: Request) {
  try {
    const customerData: Omit<Customer, 'id' | 'lastOrderDate'> = await request.json();
    
    const finalCustomerData = {
      ...customerData,
      lastOrderDate: new Date().toISOString(), // Set server-side timestamp
    };

    const newCustomerRef = await db.collection('customers').add(finalCustomerData);
    const newCustomer = await newCustomerRef.get();

    return NextResponse.json({ id: newCustomer.id, ...newCustomer.data() }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
