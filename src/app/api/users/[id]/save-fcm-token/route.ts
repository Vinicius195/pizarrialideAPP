import { db } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id: userId } = params;
    const { fcmToken } = await req.json();

    if (!userId || !fcmToken) {
      return new NextResponse('ID do usuário e token FCM são obrigatórios.', {
        status: 400,
      });
    }

    // O caminho para o documento do usuário
    const userRef = db.collection('users').doc(userId);

    // Atualiza o documento do usuário com o novo token FCM
    // Usamos merge: true para não sobrescrever outros campos do usuário
    await userRef.set(
      {
        fcmToken: fcmToken,
        fcmTokenUpdatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return new NextResponse(
      JSON.stringify({ message: 'Token salvo com sucesso.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[API_SAVE_FCM_TOKEN]', error);
    return new NextResponse('Erro interno do servidor.', { status: 500 });
  }
}
