/**
 * Live Engine Sync Routes
 * Drop-in module for Rivalis Hub Express.js server
 * 
 * Copy this to: replit_integrations/live-engine-sync/routes.js
 * 
 * Then in server.js add:
 *   const { registerLiveEngineSyncRoutes } = require("./replit_integrations/live-engine-sync");
 *   registerLiveEngineSyncRoutes(app);
 */

const admin = require('firebase-admin');

function verifyApiSecret(token) {
  const expectedSecret = process.env.HUB_API_SECRET;
  if (!expectedSecret) {
    console.warn('[LiveEngineSync] HUB_API_SECRET not configured');
    return false;
  }
  return token === `Bearer ${expectedSecret}`;
}

async function handleRepCompleted(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!verifyApiSecret(authHeader)) {
      console.warn('[LiveEngineSync] Unauthorized rep submission attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
    } = req.body;

    if (!userId) {
      throw new Error('Missing userId in payload');
    }

    const db = admin.firestore();
    const batch = admin.firestore().batch();

    // Update user stats
    const userStatsRef = db.collection('users').doc(userId).collection('stats').doc('overview');
    const userStatsDoc = await userStatsRef.get();
    const currentStats = userStatsDoc.exists ? userStatsDoc.data() : {
      totalReps: 0,
      totalScore: 0,
      sessionsPlayed: 0,
      bestScore: 0,
      averageReps: 0,
    };

    const updatedStats = {
      ...currentStats,
      totalReps: (currentStats.totalReps || 0) + repsAdded,
      totalScore: (currentStats.totalScore || 0) + scoreAdded,
      lastActivityAt: timestamp,
      bestScore: Math.max(currentStats.bestScore || 0, totalSessionScore || 0),
      sessionsPlayed: (currentStats.sessionsPlayed || 0) + 1,
    };

    updatedStats.averageReps = Math.round(updatedStats.totalReps / updatedStats.sessionsPlayed);
    batch.set(userStatsRef, updatedStats);

    // Increment raffle tickets
    const raffleRef = db.collection('users').doc(userId).collection('gamification').doc('raffle');
    const raffleDoc = await raffleRef.get();
    const currentTickets = raffleDoc.exists ? (raffleDoc.data().tickets || 0) : 0;
    batch.set(raffleRef, { tickets: currentTickets + 1 }, { merge: true });

    // Record rep history
    const repHistoryRef = db.collection('users').doc(userId).collection('repHistory').doc();
    batch.set(repHistoryRef, {
      exercise,
      repsAdded,
      scoreAdded,
      formScore,
      depth,
      sessionId,
      timestamp,
      playerId,
    });

    // Update leaderboard
    const leaderboardRef = db.collection('leaderboards').doc('allTime').collection('users').doc(userId);
    const leaderboardDoc = await leaderboardRef.get();
    const currentRanking = leaderboardDoc.exists ? leaderboardDoc.data() : {
      userId,
      totalReps: 0,
      totalScore: 0,
      lastUpdated: 0,
    };

    batch.set(leaderboardRef, {
      ...currentRanking,
      totalReps: (currentRanking.totalReps || 0) + repsAdded,
      totalScore: (currentRanking.totalScore || 0) + scoreAdded,
      lastUpdated: timestamp,
    });

    await batch.commit();

    console.log(`[LiveEngineSync] ✅ Rep synced for user ${userId}: +${repsAdded} reps, +1 ticket`);

    return res.status(200).json({
      success: true,
      message: `Rep recorded: +${repsAdded} reps, +${scoreAdded} score, +1 raffle ticket`,
      userId,
    });
  } catch (error) {
    console.error('[LiveEngineSync] Rep sync failed:', error.message);
    return res.status(500).json({
      error: 'Failed to process rep',
      message: error.message,
    });
  }
}

async function handleSessionEnded(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!verifyApiSecret(authHeader)) {
      console.warn('[LiveEngineSync] Unauthorized session end attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      sessionId,
      endedAt,
      winner,
      finalLeaderboard,
      sessionDurationMs,
      exerciseName,
    } = req.body;

    if (!sessionId || !finalLeaderboard || !Array.isArray(finalLeaderboard)) {
      throw new Error('Invalid session data');
    }

    const db = admin.firestore();
    const batch = admin.firestore().batch();

    // Archive session
    const sessionArchiveRef = db.collection('sessionArchive').doc(sessionId);
    batch.set(sessionArchiveRef, {
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

    // Update winner stats
    if (winner && winner.userId) {
      const winnerStatsRef = db.collection('users').doc(winner.userId).collection('stats').doc('overview');
      const winnerStatsDoc = await winnerStatsRef.get();
      const currentWinnerStats = winnerStatsDoc.exists ? winnerStatsDoc.data() : { gamesWon: 0 };

      batch.set(winnerStatsRef, {
        ...currentWinnerStats,
        gamesWon: (currentWinnerStats.gamesWon || 0) + 1,
        lastWinAt: endedAt,
      }, { merge: true });

      // Hall of fame
      const hallOfFameRef = db.collection('hallOfFame').doc(`${endedAt}-${sessionId}`);
      batch.set(hallOfFameRef, {
        winnerId: winner.userId,
        winnerScore: winner.finalScore,
        exercise: exerciseName,
        durationMs: sessionDurationMs,
        timestamp: endedAt,
      });
    }

    // Update placements
    for (const entry of finalLeaderboard) {
      if (!entry.userId) continue;

      const userPlacementRef = db.collection('leaderboards').doc('placements').collection('users').doc(entry.userId);
      const placementDoc = await userPlacementRef.get();
      const currentPlacements = placementDoc.exists ? placementDoc.data() : {
        firstPlace: 0,
        secondPlace: 0,
        thirdPlace: 0,
        totalPlacements: 0,
      };

      let updated = { ...currentPlacements };
      if (entry.placement === 1) {
        updated.firstPlace = (updated.firstPlace || 0) + 1;
      } else if (entry.placement === 2) {
        updated.secondPlace = (updated.secondPlace || 0) + 1;
      } else if (entry.placement === 3) {
        updated.thirdPlace = (updated.thirdPlace || 0) + 1;
      }
      updated.totalPlacements = (updated.totalPlacements || 0) + 1;

      batch.set(userPlacementRef, updated);
    }

    await batch.commit();

    console.log(`[LiveEngineSync] ✅ Session archived: ${sessionId}`);

    return res.status(200).json({
      success: true,
      message: `Session ${sessionId} archived with ${finalLeaderboard.length} finalists`,
      sessionId,
      winnerId: winner?.userId,
    });
  } catch (error) {
    console.error('[LiveEngineSync] Session archive failed:', error.message);
    return res.status(500).json({
      error: 'Failed to archive session',
      message: error.message,
    });
  }
}

function registerLiveEngineSyncRoutes(app) {
  app.post('/api/live-engine/reps/completed', handleRepCompleted);
  app.post('/api/live-engine/sessions/ended', handleSessionEnded);
  console.log('[LiveEngineSync] Routes registered');
}

module.exports = { registerLiveEngineSyncRoutes };