import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;
let authAdmin: admin.auth.Auth;
let messagingAdmin: admin.messaging.Messaging; // Declarar a variável para o Messaging

// Função para encapsular a lógica de inicialização e garantir que ela seja executada apenas uma vez.
function initializeFirebaseAdmin() {
  // Se o app já estiver inicializado (ex: em ambiente de desenvolvimento com HMR), não faz nada.
  if (admin.apps.length > 0) {
    return;
  }

  // Obtenha as variáveis de ambiente.
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyFromEnv = process.env.FIREBASE_PRIVATE_KEY;

  console.log('--- Verificando credenciais do Firebase Admin ---');
  console.log(`[DEBUG] FIREBASE_PROJECT_ID: ${projectId ? `Encontrado (${projectId.substring(0, 5)}...)` : 'NÃO ENCONTRADO'}`);
  console.log(`[DEBUG] FIREBASE_CLIENT_EMAIL: ${clientEmail ? `Encontrado (${clientEmail.substring(0, 5)}...)` : 'NÃO ENCONTRADO'}`);
  console.log(`[DEBUG] FIREBASE_PRIVATE_KEY: ${privateKeyFromEnv ? 'Encontrado' : 'NÃO ENCONTRADO'}`);

  // Verifique se todas as credenciais necessárias estão presentes.
  const hasAllCredentials = projectId && clientEmail && privateKeyFromEnv;

  if (!hasAllCredentials) {
    const errorMessage = '[AVISO DO FIREBASE] Credenciais do Admin SDK não configuradas. As rotas de API que dependem dele falharão.';
    console.warn(errorMessage);
    // Em um ambiente de produção, seria melhor lançar um erro.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    }
    return;
  }

  try {
    // Formate a chave privada corretamente.
    const formattedPrivateKey = privateKeyFromEnv.replace(/\\n/g, '\n');

    // Construa o objeto da conta de serviço.
    const serviceAccount: admin.ServiceAccount = {
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    };

    // Inicialize o aplicativo.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('[INFO DO FIREBASE] Firebase Admin SDK inicializado com sucesso.');
  } catch (error) {
    console.error(
      '[ERRO CRÍTICO DO FIREBASE] Falha ao inicializar o Firebase Admin SDK. Verifique o formato das suas variáveis de ambiente.',
      error
    );
  }
}

// Garante que a inicialização ocorra.
initializeFirebaseAdmin();

// Atribua as instâncias DEPOIS de garantir a inicialização.
if (admin.apps.length > 0) {
  db = admin.firestore();
  authAdmin = admin.auth();
  messagingAdmin = admin.messaging(); // Inicializar o Messaging
} else {
  console.error('[ERRO FATAL DO FIREBASE] Instância do Firebase Admin não disponível.');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('A inicialização do Firebase Admin falhou e o servidor não pode continuar.');
  }
  // Atribuir stubs ou mocks para evitar erros em desenvolvimento se a inicialização falhar
  db = {} as admin.firestore.Firestore;
  authAdmin = {} as admin.auth.Auth;
  messagingAdmin = {} as admin.messaging.Messaging;
}

// Exporte todas as instâncias necessárias.
export { db, authAdmin, messagingAdmin };
