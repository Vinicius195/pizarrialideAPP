import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import type { UserProfile } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

// --- Safe Notification Helper ---
async function notifyAdminsOfNewUser(newUser: UserProfile) {
    try {
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'Administrador')
            .where('status', '==', 'Aprovado')
            .get();

        if (adminsSnapshot.empty) return;
        
        const message = `👤 Novo usuário '${newUser.name}' aguardando aprovação.`;
        const relatedUrl = '/configuracoes?tab=users';
        const batch = db.batch();

        adminsSnapshot.docs.forEach(doc => {
            const adminId = doc.id;
            const newNotificationRef = db.collection('notifications').doc();
            batch.set(newNotificationRef, {
                userId: adminId,
                message,
                relatedUrl,
                priority: 'normal',
                isRead: false,
                timestamp: Timestamp.now(),
            });
        });
        
        await batch.commit();
    } catch (error) {
        console.error("Failed to create 'new user' notifications:", error);
    }
}


// GET all user profiles
export async function GET() {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ 
      key: doc.id, 
      ...doc.data() 
    })) as UserProfile[];
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST (create) a new user
export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const fallback = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
    const userProfile: Omit<UserProfile, 'key' | 'password'> = {
      name,
      email,
      role,
      status: 'Pendente',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      fallback,
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);

    // --- Safe Notification Trigger ---
    const fullUserProfile = { key: userRecord.uid, ...userProfile };
    await notifyAdminsOfNewUser(fullUserProfile);
    // --- End of Notification Trigger ---

    return NextResponse.json(fullUserProfile, { status: 201 });

  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === 'auth/email-already-exists') {
        return new NextResponse('O e-mail fornecido já está em uso.', { status: 409 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
