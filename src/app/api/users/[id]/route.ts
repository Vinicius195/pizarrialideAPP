import { NextResponse } from 'next/server';
import { db, messagingAdmin } from '@/lib/firebase-admin'; // Importar messagingAdmin
import admin from 'firebase-admin';
import type { UserProfile, UserStatus } from '@/types';
import { getAuth } from 'firebase-admin/auth';

// --- Safe Notification Helper for User Status Change ---
async function notifyUserOfStatusChange(userId: string, newStatus: UserStatus) {
    try {
        let message = '';
        if (newStatus === 'Aprovado') {
            message = '🎉 Sua conta foi aprovada! Você já pode acessar o sistema.';
        } else if (newStatus === 'Reprovado') {
            message = 'Infelizmente sua conta não foi aprovada. Contate o suporte para mais detalhes.';
        } else {
            return; // Não notificar para 'Pendente' ou outros status
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return;
        const user = userDoc.data() as UserProfile;

        // 1. Criar notificação interna (sininho)
        const notificationRef = db.collection('notifications').doc();
        const internalNotificationPromise = notificationRef.set({
            userId,
            message,
            relatedUrl: '/dashboard', // Uma página de destino neutra
            isRead: false,
            timestamp: new Date().toISOString(),
            priority: 'high'
        });

        // 2. Enviar notificação push se houver token
        let pushPromise: Promise<any> | null = null;
        if (user.fcmToken) {
            const pushPayload = {
                token: user.fcmToken,
                notification: {
                    title: 'Atualização de Conta',
                    body: message,
                    icon: '/icons/icon-192x192.png',
                },
                data: {
                    url: '/dashboard',
                    tag: `status-change-${userId}`
                },
                webpush: {
                    fcm_options: { link: '/dashboard' },
                    headers: { Urgency: 'high', TTL: (60 * 60 * 24).toString() }
                }
            };
            pushPromise = messagingAdmin.send(pushPayload);
        }

        await Promise.all([internalNotificationPromise, pushPromise].filter(Boolean));
        console.log(`Notificações de mudança de status (internas e push) enviadas para o usuário ${userId}.`);

    } catch (error) {
        console.error(`Falha ao criar/enviar notificação de mudança de status para o usuário ${userId}:`, error);
    }
}


// Helper function to get the UID of the requesting user from the Authorization header
async function getRequestingUserId(request: Request): Promise<string | null> {
  const authorizationHeader = request.headers.get('Authorization');
  if (authorizationHeader?.startsWith('Bearer ')) {
    const idToken = authorizationHeader.split('Bearer ')[1];
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      return decodedToken.uid;
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return null;
    }
  }
  return null;
}

// GET a single user profile by ID (UID), and create it if it doesn't exist.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      return NextResponse.json({ key: userDoc.id, ...userDoc.data() });
    }

    console.log(`User profile for UID ${userId} not found. Creating a default profile.`);
    const authUser = await admin.auth().getUser(userId);
    const name = authUser.displayName || 'Usuário Padrão';
    const fallback = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

    const defaultUserProfile: Omit<UserProfile, 'key' | 'password'> = {
      name,
      email: authUser.email!,
      role: 'Funcionário',
      status: 'Aprovado',
      avatar: authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      fallback,
    };
    await userDocRef.set(defaultUserProfile);
    return NextResponse.json({ key: userId, ...defaultUserProfile });
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return new NextResponse('User not found in Firebase Authentication.', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PUT (update) a user profile by ID (UID)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const requestingUid = await getRequestingUserId(request);
    if (!requestingUid) {
        return new NextResponse('Unauthorized: Invalid or missing token.', { status: 401 });
    }

    const requesterDoc = await db.collection('users').doc(requestingUid).get();
    const requesterProfile = requesterDoc.data();
    if (!requesterProfile || requesterProfile.role !== 'Administrador') {
        return new NextResponse('Forbidden: You do not have permission to perform this action.', { status: 403 });
    }

    const userIdToUpdate = params.id;
    if (requestingUid === userIdToUpdate) {
        return new NextResponse('Forbidden: Administrators cannot change their own role or status.', { status: 403 });
    }

    const dataToUpdate: Partial<UserProfile> = await request.json();
    
    await db.runTransaction(async (transaction) => {
        const userDocRef = db.collection('users').doc(userIdToUpdate);
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists) {
            throw new Error("User document not found!");
        }
        const newProfileData = { ...userDoc.data(), ...dataToUpdate };
        transaction.update(userDocRef, newProfileData);
    });

    if (dataToUpdate.status) {
        await notifyUserOfStatusChange(userIdToUpdate, dataToUpdate.status);
    }
    if (dataToUpdate.name) {
      await admin.auth().updateUser(userIdToUpdate, { displayName: dataToUpdate.name });
    }

    return NextResponse.json({ message: 'User profile updated successfully' });

  } catch (error) {
    console.error(`Error updating user profile ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE a user by ID (UID)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const requestingUid = await getRequestingUserId(request);
        if (!requestingUid) return new NextResponse('Unauthorized: Invalid or missing token.', { status: 401 });

        const requesterDoc = await db.collection('users').doc(requestingUid).get();
        const requesterProfile = requesterDoc.data();

        if (!requesterProfile || requesterProfile.role !== 'Administrador') {
            return new NextResponse('Forbidden: You do not have permission to delete users.', { status: 403 });
        }
        const userIdToDelete = params.id;
        if(requestingUid === userIdToDelete){
            return new NextResponse('Forbidden: Administrators cannot delete their own account.', { status: 403 });
        }
        await admin.auth().deleteUser(userIdToDelete);
        await db.collection('users').doc(userIdToDelete).delete();
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
