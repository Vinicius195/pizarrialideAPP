import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
} from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
});
const db = getFirestore(app);

// **CORREÇÃO**: Habilita o cache offline do Firestore
try {
  enableIndexedDbPersistence(db)
    .then(() => console.log("Persistência offline do Firestore ativada."))
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Múltiplas abas abertas, a persistência offline só será ativada em uma. Feche outras abas e recarregue.");
      } else if (err.code == 'unimplemented') {
        console.warn("O navegador atual não suporta persistência offline.");
      }
    });
} catch (error) {
    console.error("Erro ao tentar ativar a persistência offline:", error);
}


export { app, auth, db };
