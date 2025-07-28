import * as admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

let db: admin.firestore.Firestore;
let authAdmin: admin.auth.Auth;
let messagingAdmin: admin.messaging.Messaging;

function initializeFirebaseAdmin() {
    // Evita reinicialização se já houver uma instância.
    if (admin.apps.length > 0) {
        const app = admin.apps[0];
        if (app) {
            db = admin.firestore(app);
            authAdmin = admin.auth(app);
            messagingAdmin = admin.messaging(app);
        }
        return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Linha corrigida para garantir que a substituição ocorra em uma única linha
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.error('As variáveis de ambiente do Firebase Admin não estão configuradas.');
        throw new Error('As variáveis de ambiente do Firebase Admin não estão configuradas.');
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            databaseURL: `https://${projectId}.firebaseio.com`
        });

        db = admin.firestore();
        authAdmin = admin.auth();
        messagingAdmin = admin.messaging();
        console.log('Firebase Admin SDK inicializado com sucesso.');

    } catch (error) {
        console.error('Erro na inicialização do Firebase Admin:', error);
        throw new Error('Não foi possível inicializar o Firebase Admin SDK.');
    }
}

// Inicializa o SDK do Firebase Admin
initializeFirebaseAdmin();

// Função para verificar o token de autenticação de uma requisição
export async function verifyAuth(request: Request): Promise<DecodedIdToken | null> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Nenhum token do Firebase foi passado no cabeçalho de autorização.');
        return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
        return null;
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('Erro ao verificar o token do Firebase:', error);
        return null;
    }
}

// Exporta as instâncias inicializadas do admin
export { db, authAdmin, messagingAdmin };
