import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import type { Notification } from '@/types';

// Helper function to get the UID of the requesting user.
async function getRequestingUserId(request: Request): Promise<string | null> {
  const authorizationHeader = request.headers.get('Authorization');
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) return null;
  try {
    return (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    console.error("Firebase ID token verification failed:", error);
    return null;
  }
}

// GET all unread notifications for the authenticated user
export async function GET(request: Request) {
  const userId = await getRequestingUserId(request);
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .limit(100)
      .get();

    const allUserNotifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
    
    const unreadNotifications = allUserNotifications
      .filter(n => !n.isRead)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(unreadNotifications);
  } catch (error) {
    console.error("Error fetching notifications collection:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PUT: Mark all user's notifications as read
export async function PUT(request: Request) {
  const userId = await getRequestingUserId(request);
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const unreadSnapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();

    if (unreadSnapshot.empty) {
        return NextResponse.json({ message: 'No unread notifications to mark as read.' });
    }

    const batch = db.batch();
    unreadSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();

    return NextResponse.json({ message: `${unreadSnapshot.size} notifications marked as read.` });

  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
