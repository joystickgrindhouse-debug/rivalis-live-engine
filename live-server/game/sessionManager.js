/**
 * Session Manager - Orchestrates game sessions, player management, and state coordination
 * Memory-efficient with aggressive cleanup
 */

const { v4: uuidv4 } = require('uuid');
const turnManager = require('./turnManager');
const repEngine = require('./repEngine');
const eliminationEngine = require('./eliminationEngine');
const antiCheatEngine = require('./antiCheat');
const deckEngine = require('./deckEngine');
const botEngine = require('./botEngine');
const hubSync = require('../utils/hubSync');
const LIMITS = require('../config/limits');

// In-memory sessions pool
const sessions = new Map();

/**
 * Create a new game session
 */
function createSession(sessionInitData = {}) {
  const sessionId = uuidv4();
  
  const session = {
    id: sessionId,
    createdAt: Date.now(),
    status: 'waiting', // waiting, active, finished
    players: {}, // { playerId: playerData }
    playerOrder: [],
    turnState: null,
    discordVCId: null,
    // Game mode configuration
    gameMode: sessionInitData.gameMode || 'standard',
    exerciseName: sessionInitData.exerciseName || null,
    turnTimeMs: sessionInitData.turnTimeMs || LIMITS.TURN_TIME_MS,
    eliminationThreshold: sessionInitData.eliminationThreshold || LIMITS.ELIMINATION_FAIL_THRESHOLD,
    cardDeckEnabled: sessionInitData.cardDeckEnabled !== false,
    leaderboardType: sessionInitData.leaderboardType || 'score',
    // Cleanup function
    _cleanup: () => cleanupSession(sessionId),
  };

  sessions.set(sessionId, session);
  
  console.log(`✅ Session created: ${sessionId} (mode: ${session.gameMode})`);
  return session;
}

/**
 * Get session by ID
 */
function getSession(sessionId) {
  return sessions.get(sessionId);
}

/**
 * Get all active sessions (for monitoring)
 */
function getActiveSessions() {
  return Array.from(sessions.values()).filter(s => s.status !== 'finished');
}

/**
 * Add player to session (waiting phase)
 */
function addPlayerToSession(sessionId, playerId, playerName) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (session.status !== 'waiting') {
    return { error: 'Session not in waiting state' };
  }

  // Player already in session
  if (session.players[playerId]) {
    return session.players[playerId];
  }

  // Check player limit
  if (Object.keys(session.players).length >= LIMITS.MAX_PLAYERS) {
    return { error: 'Session full' };
  }

  // Create player state
  const playerData = {
    id: playerId,
    name: playerName || `Player_${playerId.substring(0, 8)}`,
    socket: null,
    repState: repEngine.createPlayerRepState(),
    eliminationState: eliminationEngine.createPlayerElimination(),
    antiCheatState: antiCheatEngine.createPlayerAntiCheat(),
    connectedAt: Date.now(),
  };

  session.players[playerId] = playerData;
  session.playerOrder.push(playerId);

  console.log(`👤 Player ${playerId} added to session ${sessionId}`);
  return playerData;
}

/**
 * Remove player from session (disconnect/spectate)
 */
function removePlayerFromSession(sessionId, playerId) {
  const session = sessions.get(sessionId);
  if (!session) return false;

  const player = session.players[playerId];
  if (!player) return false;

  // If active session, just mark as spectator
  if (session.status === 'active') {
    eliminationEngine.recordRepResult(player.eliminationState, false);
    eliminationEngine.recordRepResult(player.eliminationState, false);
    // Trigger elimination (2 failures)
    turnManager.removePlayerFromOrder(session.turnState, playerId);
    console.log(`🚪 Player ${playerId} eliminated from session ${sessionId}`);
    checkSessionEnd(sessionId);
    return true;
  }

  // If waiting, just delete
  delete session.players[playerId];
  const index = session.playerOrder.indexOf(playerId);
  if (index !== -1) {
    session.playerOrder.splice(index, 1);
  }

  console.log(`🚪 Player ${playerId} removed from session ${sessionId}`);
  return true;
}

/**
 * Start session (move from waiting to active)
 */
function startSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return { error: 'Session not found' };

  if (session.status !== 'waiting') {
    return { error: 'Session already started' };
  }

  let playerCount = session.playerOrder.length;

  // Add bots if needed before starting
  if (LIMITS.BOT_ENABLED && playerCount < LIMITS.MIN_PLAYERS) {
    const botsNeeded = LIMITS.MIN_PLAYERS - playerCount;
    const addedBots = botEngine.addBotsToSession(session, botsNeeded);
    playerCount += addedBots.length;
  }

  if (playerCount < LIMITS.MIN_PLAYERS) {
    return { error: `Need at least ${LIMITS.MIN_PLAYERS} players` };
  }

  // Create turn state
  session.turnState = turnManager.createTurnState(session.playerOrder);
  session.status = 'active';

  console.log(`🎮 Session ${sessionId} started with ${playerCount} players (${session.playerOrder.length - playerCount} bots)`);
  return { success: true, sessionId };
}

/**
 * Submit rep for player (active session only)
 * Returns { valid: boolean, repData?: {}, error?: string }
 */
function submitRepPublic(sessionId, playerId, repPayload) {
  return submitRep(sessionId, playerId, repPayload);
}

/**
 * Advance turn manually (can be called periodically or on skip)
 */
function advanceTurnInSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'active' || !session.turnState) {
    return { error: 'Invalid session state' };
  }

  // Decay suspicion for all players
  for (const playerId in session.players) {
    antiCheatEngine.decaySuspicion(session.players[playerId].antiCheatState);
  }

  // Advance turn and draw card
  const turnData = turnManager.advanceTurn(session.turnState);

  // Draw card and apply effect (if card drawn)
  if (turnData.drawnCard) {
    const targetPlayerIds = Object.keys(session.players).filter(
      id => id !== turnData.currentPlayer
    );
    
    if (targetPlayerIds.length > 0) {
      const randomTarget = targetPlayerIds[
        Math.floor(Math.random() * targetPlayerIds.length)
      ];
      turnManager.applyCardEffect(
        session.turnState,
        turnData.drawnCard.type,
        randomTarget,
        Object.keys(session.players)
      );
    }
  }

  // Check for session end
  checkSessionEnd(sessionId);

  // Handle bot turn if current player is a bot
  const currentPlayer = session.players[turnData.currentPlayer];
  if (currentPlayer && currentPlayer.isBot) {
    executeAsyncBotTurn(sessionId, turnData.currentPlayer);
  }

  return {
    success: true,
    turnNumber: turnData.turnNumber,
    currentPlayer: turnData.currentPlayer,
    drawnCard: turnData.drawnCard,
  };
}

/**
 * Execute bot turn asynchronously (doesn't block response)
 */
function executeAsyncBotTurn(sessionId, botId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const bot = session.players[botId];
  if (!bot || !bot.isBot) return;

  // Schedule bot turn without awaiting
  setImmediate(async () => {
    await botEngine.executeBotTurnAsync(bot, session, submitRep);
  });
}

/**
 * Internal rep submission (for bots and players)
 */
function submitRep(sessionId, playerId, repPayload) {
  const session = sessions.get(sessionId);
  if (!session) return { valid: false, error: 'Session not found' };

  if (session.status !== 'active') {
    return { valid: false, error: 'Session not active' };
  }

  const player = session.players[playerId];
  if (!player) return { valid: false, error: 'Player not found' };

  // Check if player is eliminated
  if (!eliminationEngine.isPlayerActive(player.eliminationState)) {
    return { valid: false, error: 'Player eliminated' };
  }

  // Check if player is frozen
  const freezeEffect = turnManager.getActiveEffect(session.turnState, playerId);
  if (freezeEffect && freezeEffect.type === 'FREEZE_OPPONENT') {
    return { valid: false, error: 'Player frozen' };
  }

  // Validate rep with anti-cheat
  const validation = antiCheatEngine.validateRep(repPayload, player.antiCheatState, Date.now());
  if (!validation.valid) {
    return { valid: false, error: validation.reason };
  }

  // Process the rep
  const cardEffect = turnManager.getActiveEffect(session.turnState, playerId);
  const repResult = repEngine.updatePlayerStats(player.repState, repPayload, cardEffect);

  // Record success
  eliminationEngine.recordRepResult(player.eliminationState, true);

  // Check for max reps per turn (prevent spam)
  if (repResult.repsAdded > LIMITS.MAX_REPS_PER_TURN) {
    return { valid: false, error: 'Too many reps in one submission' };
  }

  console.log(`✅ Rep submitted: ${playerId} in ${sessionId} (+${repResult.repsAdded} reps, +${repResult.scoreAdded} score)`);

  // Sync rep to Hub API for Firebase profile updates
  hubSync.sendRepToHub(session, player, repPayload, repResult);

  return {
    valid: true,
    repData: {
      repsAdded: repResult.repsAdded,
      scoreAdded: repResult.scoreAdded,
      cardMultiplier: repResult.cardMultiplier,
      totalReps: player.repState.totalReps,
    },
  };
}

/**
 * Check if session should end (only 1 active player left)
 */
function checkSessionEnd(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'active') return false;

  let activePlayerCount = 0;
  let lastActivePlayer = null;

  for (const playerId in session.players) {
    const player = session.players[playerId];
    if (eliminationEngine.isPlayerActive(player.eliminationState)) {
      activePlayerCount++;
      lastActivePlayer = playerId;
    }
  }

  if (activePlayerCount <= 1) {
    endSession(sessionId, lastActivePlayer);
    return true;
  }

  return false;
}

/**
 * End session
 */
function endSession(sessionId, winnerId = null) {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.status = 'finished';

  // Calculate final leaderboard
  const leaderboard = repEngine.calculateLeaderboard(session.players);

  console.log(`🏁 Session ${sessionId} ended. Winner: ${winnerId || 'N/A'}. Leaderboard:`, leaderboard);

  // Sync session end to Hub for final results / hall of fame
  if (winnerId) {
    const winner = session.players[winnerId];
    const winnerData = winner ? {
      userId: winner.userId,
      playerId: winnerId,
      finalReps: winner.repState.totalReps,
      finalScore: winner.sessionScore,
      durationMs: Date.now() - session.createdAt,
    } : null;

    const finalLeaderboard = leaderboard.map((entry) => ({
      userId: entry.userId,
      playerId: entry.playerId,
      finalReps: entry.totalReps,
      finalScore: entry.sessionScore,
      placement: entry.placement,
    }));

    hubSync.sendSessionEndedToHub(session, finalLeaderboard, winnerData);
  }

  // Schedule cleanup
  setTimeout(() => cleanupSession(sessionId), 30000); // 30s grace period

  return { success: true, winnerId, leaderboard };
}

/**
 * Clean up and delete session (free memory)
 */
function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Close all sockets
  for (const playerId in session.players) {
    const player = session.players[playerId];
    if (player.socket && player.socket.close) {
      try {
        player.socket.close();
      } catch (e) {
        // Already closed
      }
    }
  }

  // Clear session data
  session.players = {};
  session.playerOrder = [];
  session.turnState = null;

  // Delete from map
  sessions.delete(sessionId);

  console.log(`🗑️ Session ${sessionId} cleaned up`);
}

/**
 * Get session statistics (for monitoring)
 */
function getSessionStats(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  return {
    sessionId,
    status: session.status,
    playerCount: Object.keys(session.players).length,
    activePlayerCount: Object.keys(session.players).filter(
      id => eliminationEngine.isPlayerActive(session.players[id].eliminationState)
    ).length,
    uptime: Date.now() - session.createdAt,
    turnNumber: session.turnState ? session.turnState.currentTurnIndex : 0,
  };
}

/**
 * Cleanup old finished sessions periodically
 */
function periodicSessionCleanup() {
  const now = Date.now();
  const maxSessionAge = 1800000; // 30 minutes

  for (const [sessionId, session] of sessions.entries()) {
    // Clean up old finished sessions
    if (session.status === 'finished' && now - session.createdAt > maxSessionAge) {
      cleanupSession(sessionId);
    }

    // Check if bots should be added to waiting sessions
    if (session.status === 'waiting' && LIMITS.BOT_ENABLED) {
      const botsNeeded = botEngine.calculateBotsNeeded(session, LIMITS);
      if (botsNeeded > 0) {
        botEngine.addBotsToSession(session, botsNeeded);
      }
    }
  }
}

module.exports = {
  createSession,
  getSession,
  getActiveSessions,
  addPlayerToSession,
  removePlayerFromSession,
  startSession,
  submitRep: submitRepPublic,
  advanceTurnInSession,
  checkSessionEnd,
  endSession,
  cleanupSession,
  getSessionStats,
  periodicSessionCleanup,
};
