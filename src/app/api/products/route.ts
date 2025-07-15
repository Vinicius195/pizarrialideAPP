import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Product } from '@/types';

// GET all products
export async function GET() {
  try {
    const productsCollection = db.collection('products');
    const productsSnapshot = await productsCollection.get();
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST a new product
export async function POST(request: Request) {
  try {
    const productData: Omit<Product, 'id'> = await request.json();
    const newProductRef = await db.collection('products').add(productData);
    return NextResponse.json({ id: newProductRef.id, ...productData }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
