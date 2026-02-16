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

/**
 * Get user profile from Firestore
 * Returns { uid, username, avatar, stats } or null
 */
async function getUserProfile(uid) {
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const data = userDoc.data();
    
    return {
      uid,
      username: data.username || data.displayName || 'Anonymous',
      avatar: data.photoURL || data.avatar || null,
      stats: {
        totalReps: data.totalReps || 0,
        totalScore: data.totalScore || 0,
        wins: data.wins || 0,
        raffleTickets: data.raffleTickets || 0,
      },
    };
  } catch (error) {
    console.error('Failed to fetch user profile:', error.message);
    return null;
  }
}

module.exports = {
  verifyToken,
  initializeFirebase,
  getUserProfile,
};
