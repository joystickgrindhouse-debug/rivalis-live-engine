/**
 * Live Server → Hub Firebase Sync
 * Sends completed reps to Hub for profile/leaderboard/raffle updates
 * 
 * Add to: live-server/utils/hubSync.js
 */

const https = require('https');

/**
 * Send completed rep to Hub API
 * Called after each valid rep submission
 */
function sendRepToHub(sessionData, playerData, repData, repResult) {
  if (!process.env.HUB_API_URL) {
    console.warn('[HubSync] HUB_API_URL not configured - skipping sync');
    return;
  }

  const payload = {
    userId: playerData.userId,
    playerId: playerData.playerId,
    exercise: repData.exercise,
    repsAdded: repResult.repsAdded,
    scoreAdded: repResult.scoreAdded,
    formScore: repResult.formScore,
    depth: repResult.depth,
    timestamp: Date.now(),
    sessionId: sessionData.sessionId,
    totalSessionReps: playerData.totalReps,
    totalSessionScore: playerData.sessionScore,
  };

  // Send to Hub API
  postToHub('/api/live-engine/reps/completed', payload)
    .then(() => {
      console.log(`[HubSync] Rep synced for ${playerData.userId}`);
    })
    .catch((error) => {
      console.error('[HubSync] Failed to sync rep:', error.message);
      // Don't fail the game if sync fails - it's non-critical
    });
}

/**
 * Send session ended data to Hub
 */
function sendSessionEndedToHub(sessionData, finalLeaderboard, winner) {
  if (!process.env.HUB_API_URL) return;

  const payload = {
    sessionId: sessionData.id,
    winner,
    finalLeaderboard,
    endedAt: Date.now(),
    sessionDurationMs: Date.now() - sessionData.createdAt,
    exerciseName: sessionData.exerciseName,
    gameMode: sessionData.gameMode || 'standard',
  };

  postToHub('/api/live-engine/sessions/ended', payload)
    .catch((error) => {
      console.error('[HubSync] Failed to sync session end:', error.message);
    });
}

/**
 * Post data to Hub API
 */
function postToHub(endpoint, data) {
  return new Promise((resolve, reject) => {
    const hubUrl = process.env.HUB_API_URL; // e.g., https://hub.vercel.app
    
    if (!hubUrl) {
      reject(new Error('HUB_API_URL not configured'));
      return;
    }

    const url = new URL(endpoint, hubUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUB_API_SECRET}`,
        'User-Agent': 'Rivalis-Live-Server/1.0',
      },
      timeout: 5000, // 5 second timeout
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

module.exports = {
  sendRepToHub,
  sendSessionEndedToHub,
  postToHub,
};
