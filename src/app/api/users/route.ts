import { NextResponse } from 'next/server';
import { db, authAdmin, messagingAdmin } from '@/lib/firebase-admin'; // Importar messagingAdmin
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

        // Array para coletar promessas de push notifications
        const pushPromises: Promise<any>[] = [];

        adminsSnapshot.docs.forEach(doc => {
            const admin = doc.data() as UserProfile;
            const adminId = doc.id;

            // 1. Criar notificação interna (sininho)
            const newNotificationRef = db.collection('notifications').doc();
            batch.set(newNotificationRef, {
                userId: adminId,
                message,
                relatedUrl,
                priority: 'normal',
                isRead: false,
                timestamp: Timestamp.now(),
            });

            // 2. Preparar e enviar notificação push se houver token
            if (admin.fcmToken) {
                const pushPayload = {
                    token: admin.fcmToken,
                    notification: {
                        title: 'Novo Usuário Registrado',
                        body: message,
                        icon: '/icons/icon-192x192.png',
                    },
                    data: {
                        url: relatedUrl,
                        tag: `new-user-${newUser.key}`
                    },
                    webpush: {
                        fcm_options: { link: relatedUrl },
                        headers: { Urgency: 'normal', TTL: (60 * 60 * 24).toString() }
                    }
                };
                pushPromises.push(messagingAdmin.send(pushPayload));
            }
        });
        
        // Executar todas as operações em paralelo
        await Promise.all([batch.commit(), ...pushPromises]);
        console.log("Notificações de novo usuário (internas e push) enviadas.");

    } catch (error) {
        console.error("Falha ao criar/enviar notificações de 'novo usuário':", error);
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

    const userRecord = await authAdmin.createUser({
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
