import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import type { Notification } from '@/types';

/**
 * Extrai o UID do usuário a partir do token de autorização da requisição.
 * @param request A requisição Next.js.
 * @returns O UID do usuário ou null se não for autorizado.
 */
async function getRequestingUserId(request: Request): Promise<string | null> {
  const authorizationHeader = request.headers.get('Authorization');
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  
  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) return null;

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error("Falha na verificação do token Firebase ID:", error);
    return null;
  }
}

/**
 * GET: Busca as 50 notificações mais recentes para o usuário autenticado,
 * criadas APÓS a data de criação da conta do usuário.
 */
export async function GET(request: Request) {
  const userId = await getRequestingUserId(request);
  if (!userId) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  try {
    // 1. Obter a data de criação da conta do usuário
    const userRecord = await getAuth().getUser(userId);
    const creationTime = userRecord.metadata.creationTime; // Formato ISO 8601 (string)
    
    // 2. Modificar a query para incluir o filtro de data
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('timestamp', '>=', creationTime) // Filtra notificações criadas após o registro
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
    
    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error("Erro ao buscar notificações:", error);
    // Adiciona uma verificação para o caso de o usuário não ser encontrado no Auth
    if (error.code === 'auth/user-not-found') {
        return new NextResponse('Usuário não encontrado na autenticação.', { status: 404 });
    }
    return new NextResponse('Erro Interno do Servidor', { status: 500 });
  }
}

/**
 * PUT: Marca uma ou mais notificações como lidas.
 */
export async function PUT(request: Request) {
  const userId = await getRequestingUserId(request);
  if (!userId) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  try {
    const { notificationIds }: { notificationIds: string[] } = await request.json();
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return new NextResponse('Corpo da requisição inválido. É esperado um array "notificationIds".', { status: 400 });
    }

    const chunkSize = 500;
    for (let i = 0; i < notificationIds.length; i += chunkSize) {
      const chunk = notificationIds.slice(i, i + chunkSize);
      const batch = db.batch();
      chunk.forEach(id => {
        const docRef = db.collection('notifications').doc(id);
        batch.update(docRef, { read: true });
      });
      await batch.commit();
    }

    return NextResponse.json({ message: `${notificationIds.length} notificações marcadas como lidas.` });

  } catch (error) {
    console.error("Erro ao marcar notificações como lidas:", error);
    return new NextResponse('Erro Interno do Servidor', { status: 500 });
  }
}
