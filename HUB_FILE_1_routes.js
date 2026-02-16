/**
 * Live Engine Sync Routes
 * Handles rep completion and session end data from Live Server
 * Updates Firebase profiles, raffle tickets, and leaderboards
 */

const admin = require('firebase-admin');
const { getRandomSocialImage } = require('./config/socialImages');

/**
 * Verify Bearer token from Live Server
 */
function verifyApiSecret(token) {
  const expectedSecret = process.env.HUB_API_SECRET;
  if (!expectedSecret) {
    console.warn('[LiveEngineSync] HUB_API_SECRET not configured');
    return false;
  }
  return token === `Bearer ${expectedSecret}`;
}

/**
 * Handle individual rep completion
 */
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

    const raffleRef = db.collection('users').doc(userId).collection('gamification').doc('raffle');
    const raffleDoc = await raffleRef.get();
    const currentTickets = raffleDoc.exists ? (raffleDoc.data().tickets || 0) : 0;
    batch.set(raffleRef, { tickets: currentTickets + 1 }, { merge: true });

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

    console.log(
      `[LiveEngineSync] ✅ Rep synced for user ${userId}: +${repsAdded} reps, +1 ticket`
    );

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

/**
 * Handle session completion
 */
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
      gameMode,
    } = req.body;

    if (!sessionId || !finalLeaderboard || !Array.isArray(finalLeaderboard)) {
      throw new Error('Invalid session data');
    }

    const db = admin.firestore();
    const batch = admin.firestore().batch();

    // Get random social image for results display
    const socialImage = getRandomSocialImage();

    const sessionArchiveRef = db.collection('sessionArchive').doc(sessionId);
    batch.set(sessionArchiveRef, {
      sessionId,
      exerciseName,
      gameMode: gameMode || 'standard',
      endedAt,
      durationMs: sessionDurationMs,
      winner: winner ? { userId: winner.userId, finalScore: winner.finalScore } : null,
      leaderboard: finalLeaderboard.map((entry) => ({
        userId: entry.userId,
        finalScore: entry.finalScore,
        finalReps: entry.finalReps,
        placement: entry.placement,
      })),
      socialImage: {
        id: socialImage.id,
        url: socialImage.url,
        description: socialImage.description,
      },
    });

    if (winner && winner.userId) {
      const winnerStatsRef = db.collection('users').doc(winner.userId).collection('stats').doc('overview');
      const winnerStatsDoc = await winnerStatsRef.get();
      const currentWinnerStats = winnerStatsDoc.exists ? winnerStatsDoc.data() : { gamesWon: 0 };

      batch.set(winnerStatsRef, {
        ...currentWinnerStats,
        gamesWon: (currentWinnerStats.gamesWon || 0) + 1,
        lastWinAt: endedAt,
      }, { merge: true });

      const hallOfFameRef = db.collection('hallOfFame').doc(`${endedAt}-${sessionId}`);
      batch.set(hallOfFameRef, {
        winnerId: winner.userId,
        winnerScore: winner.finalScore,
        exercise: exerciseName,
        durationMs: sessionDurationMs,
        timestamp: endedAt,
      });
    }

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
      gameMode: gameMode || 'standard',
      winnerId: winner?.userId,
      socialImage: {
        id: socialImage.id,
        url: socialImage.url,
        resultsPageUrl: `/results?sessionId=${sessionId}&gameMode=${gameMode || 'standard'}&imageId=${socialImage.id}`,
      },
    });
  } catch (error) {
    console.error('[LiveEngineSync] Session archive failed:', error.message);
    return res.status(500).json({
      error: 'Failed to archive session',
      message: error.message,
    });
  }
}

/**
 * Get session data for results display
 */
async function getSessionData(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const db = admin.firestore();
    const sessionRef = db.collection('sessionArchive').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();

    return res.status(200).json({
      sessionId,
      gameMode: sessionData.gameMode,
      socialImage: sessionData.socialImage,
      winner: sessionData.winner,
      exerciseName: sessionData.exerciseName,
      endedAt: sessionData.endedAt,
      durationMs: sessionData.durationMs,
    });
  } catch (error) {
    console.error('[LiveEngineSync] Failed to fetch session data:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch session data',
      message: error.message,
    });
  }
}

/**
 * Handle social share bonus - Award extra ticket when user shares results
 */
async function handleShareBonus(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    // For share bonus, we use sessionId as temporary verification (can be enhanced with proper auth)
    const expectedSecret = req.body.sessionId;
    
    if (!authHeader.includes(expectedSecret)) {
      console.warn('[LiveEngineSync] Invalid share bonus request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      sessionId,
      userId,
      bonusTickets,
      timestamp,
    } = req.body;

    if (!userId || !bonusTickets) {
      throw new Error('Missing userId or bonusTickets');
    }

    const db = admin.firestore();
    const batch = admin.firestore().batch();

    // Award bonus raffle tickets
    const raffleRef = db.collection('users').doc(userId).collection('gamification').doc('raffle');
    const raffleDoc = await raffleRef.get();
    const currentTickets = raffleDoc.exists ? (raffleDoc.data().tickets || 0) : 0;
    
    batch.set(raffleRef, { 
      tickets: currentTickets + bonusTickets,
      lastBonusAt: timestamp,
      lastBonusType: 'social_share',
      lastSharedSessionId: sessionId,
    }, { merge: true });

    // Log the share event
    const shareHistoryRef = db.collection('users').doc(userId).collection('shareHistory').doc();
    batch.set(shareHistoryRef, {
      sessionId,
      bonusTickets,
      timestamp,
      type: 'social_share',
    });

    await batch.commit();

    console.log(
      `[LiveEngineSync] ✅ Share bonus awarded to user ${userId}: +${bonusTickets} tickets for session ${sessionId}`
    );

    return res.status(200).json({
      success: true,
      message: `Share bonus awarded: +${bonusTickets} raffle tickets`,
      userId,
      bonusTickets,
      totalTicketsNow: currentTickets + bonusTickets,
    });
  } catch (error) {
    console.error('[LiveEngineSync] Share bonus failed:', error.message);
    return res.status(500).json({
      error: 'Failed to award share bonus',
      message: error.message,
    });
  }
}

/**
 * Register Live Engine Sync routes
 */
function registerLiveEngineSyncRoutes(app) {
  app.post('/api/live-engine/reps/completed', handleRepCompleted);
  app.post('/api/live-engine/sessions/ended', handleSessionEnded);
  app.get('/api/session/:sessionId', getSessionData);
  app.post('/api/live-engine/share-bonus', handleShareBonus);
  console.log('[LiveEngineSync] Routes registered: /api/live-engine/reps/completed, /api/live-engine/sessions/ended, /api/session/:sessionId, /api/live-engine/share-bonus');
}

module.exports = { registerLiveEngineSyncRoutes };
