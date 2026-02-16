/**
 * Hub Client Integration Guide & Example
 * Shows how to use RivalisHubClient to connect Rivalis Hub to Live Server
 */

const RivalisHubClient = require('./hub-client');

/**
 * STEP 1: Initialize the client
 */
function initializeHubClient(firebaseToken) {
  const client = new RivalisHubClient({
    serverUrl: 'ws://localhost:8080', // or your server address
    userId: 'user-id-from-firebase',
    firebaseToken: firebaseToken,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
  });

  // Listen for connection events
  client.on('connected', () => {
    console.log('✅ Connected to Live Server');
  });

  client.on('disconnected', () => {
    console.log('❌ Disconnected from Live Server');
  });

  client.on('error', (error) => {
    console.error('⚠️ Connection error:', error.message);
  });

  return client;
}

/**
 * STEP 2: Connect to server
 */
async function connectToLiveServer(client) {
  try {
    await client.connect();
    console.log('✅ Connected to Rivalis Live Server');
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
  }
}

/**
 * STEP 3: Join a multiplayer session
 */
function startMultiplayerGame(client, sessionId) {
  // Listen for session events
  client.on('sessionJoined', (data) => {
    console.log('✅ Joined session:', data.sessionId);
    console.log('Players in session:', data.players.length);
  });

  client.on('sessionStarted', (data) => {
    console.log('🎮 Game started!');
    console.log('Current exercise:', data.currentExercise);
    console.log('Current player:', data.currentPlayer);
  });

  client.on('turnAdvanced', (data) => {
    console.log('➡️  Turn advanced');
    console.log('New exercise:', data.currentExercise);
    console.log('Active cards:', data.activeCards.length);
  });

  client.on('leaderboardUpdated', (leaderboard) => {
    console.log('📊 Leaderboard updated:');
    leaderboard.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.playerId}: ${entry.sessionScore} points`);
    });
  });

  // Join the session
  client.joinSession(sessionId);
}

/**
 * STEP 4: Submit reps from MediaPipe
 * This is called by your Hub's pose detection system
 */
function submitExerciseRep(client, repData) {
  /**
   * repData should contain:
   * {
   *   exercise: 'pushups',
   *   angles: [293, 283, 50, 46, ...],      // From MediaPipe
   *   distances: [1476, null, 1274, 1193],  // From MediaPipe
   *   visibility: 0.79,                     // From MediaPipe confidence
   *   repTimeMs: 2150,                      // Time from start to end of rep
   *   timestamp: 1739607000000,             // When rep was submitted
   *   formScore: 0.85,                      // Hub's local form validation
   *   depth: 0.72,                          // Hub's local depth calculation
   * }
   */

  client.submitRep(repData);

  // Listen for rep processing result
  client.on('repProcessed', (result) => {
    if (result.isValid) {
      console.log(`✅ Rep accepted! +${result.repsAdded} reps, +${result.scoreAdded} points`);
      console.log(`   Form: ${(result.formScore * 100).toFixed(0)}%, Depth: ${(result.depth * 100).toFixed(0)}%`);
    } else {
      console.log(`❌ Rep rejected: ${result.reason}`);
    }
  });
}

/**
 * STEP 5: Handle card effects
 */
function setupCardHandlers(client, uiUpdateCallback) {
  client.on('cardDrawn', (data) => {
    console.log(`🎴 Card drawn: ${data.cardName}`);
    console.log(`   Effect: ${data.effect}`);
    uiUpdateCallback('cardDrawn', data);
  });

  client.on('cardApplied', (data) => {
    console.log(`💫 Card applied: ${data.cardName} to ${data.targetPlayer}`);
    uiUpdateCallback('cardApplied', data);
  });
}

/**
 * STEP 6: Handle game end
 */
function setupGameEndHandler(client, endGameCallback) {
  client.on('sessionEnded', (data) => {
    console.log('🏆 Game ended!');
    console.log('Winner:', data.winner);
    console.log('Final leaderboard:', data.finalLeaderboard);
    endGameCallback(data);
  });

  client.on('playerEliminated', (data) => {
    console.log(`⚠️  Player eliminated: ${data.playerName}`);
    console.log(`   Reason: ${data.reason}`);
  });
}

/**
 * FULL INTEGRATION EXAMPLE
 */
class HubGameManager {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.sessionId = null;
    this.isGameRunning = false;
  }

  async initialize(firebaseToken) {
    // Initialize client
    this.client = initializeHubClient(firebaseToken);

    // Connect to server
    await connectToLiveServer(this.client);

    // Setup handlers
    setupCardHandlers(this.client, this.onUIUpdate.bind(this));
    setupGameEndHandler(this.client, this.onGameEnd.bind(this));

    return this.client;
  }

  startGame(sessionId) {
    this.sessionId = sessionId;
    this.isGameRunning = true;
    startMultiplayerGame(this.client, sessionId);
  }

  // Called when Hub's MediaPipe detects a completed rep
  onRepDetected(repData) {
    if (!this.isGameRunning) return;

    console.log(`[HubGameManager] Rep detected: ${repData.exercise}`);
    submitExerciseRep(this.client, {
      exercise: repData.exercise,              // From MediaPipe exercise type
      angles: repData.angles,                  // From MediaPipe pose detection
      distances: repData.distances,            // From MediaPipe pose detection
      visibility: repData.visibility,          // From MediaPipe confidence
      repTimeMs: repData.repCount,             // Time for this rep
      timestamp: Date.now(),
      formScore: repData.formQuality || 0.7,   // From Hub's validation
      depth: repData.depthQuality || 0.7,      // From Hub's validation
    });
  }

  onUIUpdate(eventType, data) {
    // Update Hub UI with game events
    console.log(`[UI] ${eventType}:`, data);
    // Call your Hub's UI update functions here
  }

  onGameEnd(data) {
    this.isGameRunning = false;
    console.log('[HubGameManager] Game ended');
    // Update Hub UI with final results
  }

  getGameState() {
    if (!this.client) return null;
    return this.client.getPlayerState();
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}

module.exports = {
  RivalisHubClient: require('./hub-client'),
  HubGameManager,
  initializeHubClient,
  connectToLiveServer,
  startMultiplayerGame,
  submitExerciseRep,
  setupCardHandlers,
  setupGameEndHandler,
};
