/**
 * API Endpoint: POST /api/sessions/ended
 * 
 * Receives session completion data from Live Server
 * Updates final leaderboards and session archives
 * 
 * Expected payload from Live Server:
 * {
 *   sessionId: string,
 *   endedAt: number,
 *   winner: {
 *     userId: string,
 *     playerId: string,
 *     finalReps: number,
 *     finalScore: number,
 *     durationMs: number
 *   },
 *   finalLeaderboard: [
 *     {
 *       userId: string,
 *       playerId: string,
 *       finalReps: number,
 *       finalScore: number,
 *       placement: number
 *     }
 *   ],
 *   sessionDurationMs: number,
 *   exerciseName: string
 * }
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin
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
 * Handle session completion
 */
async function handleSessionEnded(payload) {
  const {
    sessionId,
    endedAt,
    winner,
    finalLeaderboard,
    sessionDurationMs,
    exerciseName,
  } = payload;

  if (!sessionId || !finalLeaderboard || !Array.isArray(finalLeaderboard)) {
    throw new Error('Invalid session data');
  }

  // Archive session results
  const sessionArchiveRef = db.ref(`sessionArchive/${sessionId}`);
  await sessionArchiveRef.set({
    sessionId,
    exerciseName,
    endedAt,
    durationMs: sessionDurationMs,
    winner: winner ? { userId: winner.userId, finalScore: winner.finalScore } : null,
    leaderboard: finalLeaderboard.map((entry) => ({
      userId: entry.userId,
      finalScore: entry.finalScore,
      finalReps: entry.finalReps,
      placement: entry.placement,
    })),
  });

  // Update winner stats if exists
  if (winner && winner.userId) {
    const winnerRef = db.ref(`users/${winner.userId}/stats`);
    await winnerRef.transaction((stats) => {
      if (!stats) {
        stats = { gamesWon: 0 };
      }
      stats.gamesWon = (stats.gamesWon || 0) + 1;
      stats.lastWinAt = endedAt;
      return stats;
    });

    // Add to hall of fame
    const hallOfFameRef = db.ref(`hallOfFame/${endedAt}-${sessionId}`);
    await hallOfFameRef.set({
      winnerId: winner.userId,
      winnerScore: winner.finalScore,
      exercise: exerciseName,
      durationMs: sessionDurationMs,
      timestamp: endedAt,
    });
  }

  // Update leaderboard placements for all finalists
  for (const entry of finalLeaderboard) {
    if (!entry.userId) continue;

    const userLeaderboardRef = db.ref(`leaderboards/placements/${entry.userId}`);
    await userLeaderboardRef.transaction((placements) => {
      if (!placements) {
        placements = {
          firstPlace: 0,
          secondPlace: 0,
          thirdPlace: 0,
          totalPlacements: 0,
        };
      }

      if (entry.placement === 1) {
        placements.firstPlace = (placements.firstPlace || 0) + 1;
      } else if (entry.placement === 2) {
        placements.secondPlace = (placements.secondPlace || 0) + 1;
      } else if (entry.placement === 3) {
        placements.thirdPlace = (placements.thirdPlace || 0) + 1;
      }

      placements.totalPlacements = (placements.totalPlacements || 0) + 1;
      return placements;
    });
  }

  return {
    success: true,
    message: `Session ${sessionId} archived with ${finalLeaderboard.length} finalists`,
    sessionId,
    winnerId: winner?.userId,
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
    console.warn('[API] Unauthorized session end attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify Firebase is initialized
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // Process session end
    const result = await handleSessionEnded(req.body);

    console.log(`[API] ✅ Session archived: ${req.body.sessionId}`);

    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] Session archive failed:', error.message);
    return res.status(500).json({
      error: 'Failed to archive session',
      message: error.message,
    });
  }
}
