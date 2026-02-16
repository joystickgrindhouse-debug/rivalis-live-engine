/**
 * API Endpoint: POST /api/reps/completed
 * 
 * Receives individual rep submissions from Live Server via hubSync.js
 * Updates user profiles in Firebase:
 * - Increments totalReps in stats
 * - Adds scoreAdded to totalScore in stats
 * - Increments raffleTickets by 1
 * - Updates allTime leaderboard
 * 
 * Expected payload from Live Server:
 * {
 *   userId: string,
 *   playerId: string,
 *   exercise: string,
 *   repsAdded: number,
 *   scoreAdded: number,
 *   formScore: number (0-1),
 *   depth: number (0-1),
 *   timestamp: number,
 *   sessionId: string,
 *   totalSessionReps: number,
 *   totalSessionScore: number
 * }
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin (uses FIREBASE_ADMIN_SDK env var)
let db;
try {
  const apps = getApps();
  if (apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK || '{}');
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
  db = getDatabase();
} catch (error) {
  console.error('[API] Firebase initialization failed:', error);
}

/**
 * Verify API request is from Live Server
 */
function verifyApiSecret(token) {
  const expectedSecret = process.env.HUB_API_SECRET;
  if (!expectedSecret) {
    console.warn('[API] HUB_API_SECRET not configured');
    return false;
  }
  return token === `Bearer ${expectedSecret}`;
}

/**
 * Handle rep completion: update user profile and raffle tickets
 */
async function handleRepCompleted(payload) {
  const {
    userId,
    playerId,
    exercise,
    repsAdded,
    scoreAdded,
    formScore,
    depth,
    timestamp,
    sessionId,
    totalSessionReps,
    totalSessionScore,
  } = payload;

  if (!userId) {
    throw new Error('Missing userId in payload');
  }

  // Update user stats
  const userStatsRef = db.ref(`users/${userId}/stats`);
  await userStatsRef.transaction((stats) => {
    if (!stats) {
      stats = {
        totalReps: 0,
        totalScore: 0,
        sessionsPlayed: 0,
        bestScore: 0,
        averageReps: 0,
      };
    }

    stats.totalReps = (stats.totalReps || 0) + repsAdded;
    stats.totalScore = (stats.totalScore || 0) + scoreAdded;
    stats.lastActivityAt = timestamp;

    // Update best score if applicable
    if (totalSessionScore > (stats.bestScore || 0)) {
      stats.bestScore = totalSessionScore;
    }

    // Recalculate average
    stats.sessionsPlayed = (stats.sessionsPlayed || 0) + 1;
    stats.averageReps = Math.round(stats.totalReps / stats.sessionsPlayed);

    return stats;
  });

  // Increment raffle tickets (1 per rep completed)
  const raffleRef = db.ref(`users/${userId}/raffleTickets`);
  await raffleRef.transaction((tickets) => {
    return (tickets || 0) + 1;
  });

  // Record individual rep in history
  const repHistoryRef = db.ref(`users/${userId}/repHistory`).push();
  await repHistoryRef.set({
    exercise,
    repsAdded,
    scoreAdded,
    formScore,
    depth,
    sessionId,
    timestamp,
    playerId,
  });

  // Update leaderboard ranking
  const leaderboardRef = db.ref(`leaderboards/allTime/${userId}`);
  await leaderboardRef.transaction((ranking) => {
    if (!ranking) {
      ranking = {
        userId,
        totalReps: 0,
        totalScore: 0,
        lastUpdated: 0,
      };
    }

    ranking.totalReps = (ranking.totalReps || 0) + repsAdded;
    ranking.totalScore = (ranking.totalScore || 0) + scoreAdded;
    ranking.lastUpdated = timestamp;

    return ranking;
  });

  return {
    success: true,
    message: `Rep recorded: +${repsAdded} reps, +${scoreAdded} score, +1 raffle ticket`,
    userId,
  };
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
  // Validate method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify API secret
  const authHeader = req.headers.authorization || '';
  if (!verifyApiSecret(authHeader)) {
    console.warn('[API] Unauthorized rep submission attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify Firebase is initialized
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // Process rep
    const result = await handleRepCompleted(req.body);

    // Log successful sync
    console.log(
      `[API] ✅ Rep synced for user ${req.body.userId}: +${req.body.repsAdded} reps, +1 ticket`
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] Rep sync failed:', error.message);
    return res.status(500).json({
      error: 'Failed to process rep',
      message: error.message,
    });
  }
}
