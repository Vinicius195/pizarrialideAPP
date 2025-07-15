import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Product } from '@/types';

// GET a single product by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const productId = params.id;
    const productDoc = await db.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      return new NextResponse('Product not found', { status: 404 });
    }

    const product = { id: productDoc.id, ...productDoc.data() } as Product;
    return NextResponse.json(product);
  } catch (error) {
    console.error(`Error fetching product ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PUT (update) a product by ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const productId = params.id;
    const productData: Partial<Product> = await request.json();

    await db.collection('products').doc(productId).update(productData);

    return NextResponse.json({ id: productId, ...productData });
  } catch (error) {
    console.error(`Error updating product ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE a product by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const productId = params.id;
    await db.collection('products').doc(productId).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting product ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
