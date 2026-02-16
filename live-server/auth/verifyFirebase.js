/**
 * Firebase token verification
 * Lightweight verification without storing full user data in memory
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (credentials via environment)
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    // Firebase credentials must be passed via environment
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (!serviceAccount) {
      console.error('⚠️ FIREBASE_SERVICE_ACCOUNT not set');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
}

/**
 * Verify Firebase ID token
 * Returns { uid: string, email: string } or null on failure
 */
async function verifyToken(idToken) {
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  if (!idToken || typeof idToken !== 'string') {
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Return only uid and email (minimize memory)
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
    };
  } catch (error) {
    console.warn('Token verification failed:', error.message.substring(0, 50));
    return null;
  }
}

module.exports = {
  verifyToken,
  initializeFirebase,
};
