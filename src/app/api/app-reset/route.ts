import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

async function deleteCollection(db: admin.firestore.Firestore, collectionPath: string, batchSize: number = 100) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db: admin.firestore.Firestore, query: admin.firestore.Query, resolve: (value: unknown) => void) {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
        return resolve(true);
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

export async function POST(request: Request) {
    try {
        const loggedInUser = await verifyAuth(request);
        if (!loggedInUser) {
            return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
        }

        // --- Security Check: Only Admins can perform this action ---
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(loggedInUser.uid).get();
        const userData = userDoc.data();

        if (userData?.role !== 'Administrador') {
            return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem resetar a aplicação.' }, { status: 403 });
        }

        // --- Deletion Logic ---
        // Run deletions in parallel for efficiency
        await Promise.all([
            deleteCollection(db, 'orders'),
            deleteCollection(db, 'notifications')
        ]);
        
        console.log(`App reset performed by admin: ${userData.name} (${loggedInUser.uid})`);

        return NextResponse.json({ message: 'Reset do aplicativo concluído com sucesso. Pedidos e notificações foram apagados.' }, { status: 200 });

    } catch (error: any) {
        console.error('Erro ao resetar o aplicativo:', error);
        return NextResponse.json({ error: 'Ocorreu um erro interno ao tentar resetar o aplicativo.', details: error.message }, { status: 500 });
    }
}
