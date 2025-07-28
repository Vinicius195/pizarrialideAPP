import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Helper function to get the UID of the requesting user.
async function getRequestingUserId(request: Request): Promise<string | null> {
  const authorizationHeader = request.headers.get('Authorization');
  if (authorizationHeader?.startsWith('Bearer ')) {
    const idToken = authorizationHeader.split('Bearer ')[1];
    try {
      return (await getAuth().verifyIdToken(idToken)).uid;
    } catch (error) {
      return null;
    }
  }
  return null;
}

// PUT: Mark a notification as read
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getRequestingUserId(request);
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const notificationId = params.id;
    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      return new NextResponse('Notification not found', { status: 404 });
    }

    // Security Check: Ensure the notification belongs to the user making the request.
    if (notificationDoc.data()?.userId !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Mark as read
    await notificationRef.update({ isRead: true });

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(`Error updating notification ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
