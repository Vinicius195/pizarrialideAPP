import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK if it hasn't been already.
function initializeFirebaseAdmin() {
  // Check if an app is already initialized to prevent errors during hot-reloads
  if (admin.apps.length > 0) {
    console.log('[FIREBASE INFO] Firebase Admin SDK already initialized.');
    return admin.apps[0]; // Return the existing app instance
  }

  // Retrieve credentials from environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyFromEnv = process.env.FIREBASE_PRIVATE_KEY;

  // Validate that all required environment variables are present
  if (!projectId || !clientEmail || !privateKeyFromEnv) {
    const errorMsg = '[FIREBASE ADMIN ERROR] Missing credentials. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are correctly set.';
    console.error(errorMsg);
    // In a production environment, it's better to fail hard
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    }
    return null; // In development, return null and let the getter functions handle it
  }

  try {
    // Correctly format the private key by replacing the literal `\\n` characters with actual newlines.
    const formattedPrivateKey = privateKeyFromEnv.replace(/\\n/g, '\n');

    const serviceAccount: admin.ServiceAccount = {
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    };

    // Initialize the Firebase Admin app
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('[FIREBASE INFO] Firebase Admin SDK initialized successfully.');
    return app;

  } catch (error) {
    console.error('[FIREBASE CRITICAL ERROR] Failed to initialize Firebase Admin SDK. This is often due to malformed credentials.', error);
    // This crash is intentional if the Admin SDK is critical for the application
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

// Initialize the app
const app = initializeFirebaseAdmin();

// --- Service Getters ---
// These functions ensure you always get a valid service instance,
// or they will throw a clear error if initialization failed.

const getDb = () => {
  if (!app) throw new Error("Firestore Admin is not available. Check initialization logs.");
  return admin.firestore(app);
};

const getAuthAdmin = () => {
  if (!app) throw new Error("Auth Admin is not available. Check initialization logs.");
  return admin.auth(app);
};

const getMessagingAdmin = () => {
  if (!app) throw new Error("Messaging Admin is not available. Check initialization logs.");
  return admin.messaging(app);
};

// Export the getter functions instead of the raw service objects
export const db = getDb();
export const authAdmin = getAuthAdmin();
export const messagingAdmin = getMessagingAdmin();
