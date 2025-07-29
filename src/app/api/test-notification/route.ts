// src/app/api/test-notification/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db as firestoreAdmin } from '@/lib/firebase-admin'; // Corrigido: importando 'db' e renomeando localmente
import { sendNotification } from '@/lib/fcm';

/**
 * Rota de API para enviar uma notificação de teste para o usuário autenticado.
 * 
 * @param req A requisição Next.js, que deve conter um token de autorização.
 * @returns Uma resposta JSON indicando o sucesso ou a falha do envio.
 */
export async function GET(req: NextRequest) {
  // A inicialização do Firebase Admin agora é feita automaticamente no módulo 'firebase-admin'.

  // 1. Autenticar o usuário a partir do token no cabeçalho
  const authToken = req.headers.get('authorization')?.split('Bearer ')[1];
  if (!authToken) {
    return NextResponse.json({ error: 'Token de autenticação não fornecido.' }, { status: 401 });
  }

  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(authToken);
  } catch (error) {
    console.error('Erro ao verificar o token de autenticação:', error);
    return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 403 });
  }

  const userId = decodedToken.uid;

  try {
    // 2. Buscar o token FCM do usuário no Firestore
    const userDocRef = firestoreAdmin.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado no Firestore.' }, { status: 404 });
    }

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      return NextResponse.json({ error: 'O usuário não possui um token FCM registrado. Ative as notificações no app.' }, { status: 400 });
    }

    // 3. Preparar e enviar a notificação de teste
    const testPayload = {
      title: 'Notificação de Teste 🚀',
      body: 'Se você recebeu esta mensagem, o sistema está funcionando!',
      click_action: '/pedidos', // Redireciona para a página de pedidos ao clicar
    };

    await sendNotification(fcmToken, testPayload);

    // 4. Retornar uma resposta de sucesso
    return NextResponse.json({ success: true, message: `Notificação de teste enviada para o usuário ${userId}.` });

  } catch (error: any) {
    console.error('Erro inesperado ao enviar notificação de teste:', error);
    return NextResponse.json({ error: 'Falha ao enviar a notificação de teste.', details: error.message }, { status: 500 });
  }
}
