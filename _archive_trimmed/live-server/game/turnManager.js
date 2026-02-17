/**
 * Turn Manager - Handles turn progression, card effects, and state updates
 * Uses timestamp comparisons for card effect durations (no setTimeout spam)
 */

const deckEngine = require('./deckEngine');
const LIMITS = require('../config/limits');

/**
 * Initialize turn state for a session
 */
function createTurnState(playerOrder) {
  return {
    currentTurnIndex: 0,
    playerOrder: [...playerOrder], // Snapshot of order
    turnStartTime: Date.now(),
    activeDuration: LIMITS.TURN_TIME_MS,
    deckState: deckEngine.createDeck(),
    cardEffects: {}, // { playerId: { type, expiresAt } }
  };
}

/**
 * Get the current active player ID
 */
function getCurrentPlayer(turnState) {
  if (turnState.playerOrder.length === 0) return null;
  return turnState.playerOrder[turnState.currentTurnIndex % turnState.playerOrder.length];
}

/**
 * Get time remaining in current turn (milliseconds)
 */
function getTimeRemaining(turnState) {
  const elapsed = Date.now() - turnState.turnStartTime;
  const remaining = turnState.activeDuration - elapsed;
  return Math.max(0, remaining);
}

/**
 * Check if current turn should advance
 * Returns { shouldAdvance: boolean, reason?: string }
 */
function checkTurnAdvance(turnState) {
  const timeRemaining = getTimeRemaining(turnState);
  
  if (timeRemaining <= 0) {
    return { shouldAdvance: true, reason: 'Turn time expired' };
  }

  return { shouldAdvance: false };
}

/**
 * Advance to next turn and draw a card
 */
function advanceTurn(turnState) {
  const card = deckEngine.drawCard(turnState.deckState);
  
  // Move to next turn
  turnState.currentTurnIndex += 1;
  turnState.turnStartTime = Date.now();

  // Clean up expired card effects
  cleanupExpiredEffects(turnState);

  return {
    currentPlayer: getCurrentPlayer(turnState),
    drawnCard: card,
    turnNumber: turnState.currentTurnIndex + 1,
  };
}

/**
 * Apply a card effect to players
 * Uses timestamp expiration instead of setTimeout
 */
function applyCardEffect(turnState, cardType, targetPlayerId, allPlayerIds) {
  const effectDuration = 120000; // 2 turns in milliseconds (120 seconds)
  const expiresAt = Date.now() + effectDuration;

  const effect = {
    type: cardType,
    expiresAt,
  };

  // Handle different card types
  switch (cardType) {
    case 'FREEZE_OPPONENT':
      // Freeze target player - they can't submit reps
      if (targetPlayerId && !turnState.cardEffects[targetPlayerId]) {
        turnState.cardEffects[targetPlayerId] = effect;
      }
      break;

    case 'DOUBLE_REPS':
      // Player's next rep counts double
      if (targetPlayerId) {
        turnState.cardEffects[targetPlayerId] = effect;
      }
      break;

    case 'STEAL_REP':
      // Stealing logic happens at rep submission time
      // Just mark the effect
      if (targetPlayerId) {
        turnState.cardEffects[targetPlayerId] = effect;
      }
      break;

    case 'REVERSE_ORDER':
      // Reverse player order for this round
      turnState.playerOrder = turnState.playerOrder.reverse();
      // Store effect so we know to reverse back
      turnState.cardEffects._reverse = { type: 'REVERSE_ORDER', expiresAt };
      break;

    case 'FORM_PENALTY':
      // Reduce form acceptance for target player
      if (targetPlayerId) {
        turnState.cardEffects[targetPlayerId] = { ...effect, multiplier: 0.8 };
      }
      break;
  }

  return effect;
}

/**
 * Check if a card effect is active for a player
 */
function getActiveEffect(turnState, playerId) {
  const effect = turnState.cardEffects[playerId];
  
  if (!effect) return null;
  
  // Check if expired
  if (Date.now() > effect.expiresAt) {
    delete turnState.cardEffects[playerId];
    return null;
  }

  return effect;
}

/**
 * Clean up expired effects (called at turn advancement)
 */
function cleanupExpiredEffects(turnState) {
  const now = Date.now();
  
  for (const playerId in turnState.cardEffects) {
    const effect = turnState.cardEffects[playerId];
    if (now > effect.expiresAt) {
      delete turnState.cardEffects[playerId];
    }
  }
}

/**
 * Count active players in player order
 */
function getActivePlayers(turnState) {
  return turnState.playerOrder.length;
}

/**
 * Remove a player from turn order (elimination)
 */
function removePlayerFromOrder(turnState, playerId) {
  const index = turnState.playerOrder.indexOf(playerId);
  if (index !== -1) {
    turnState.playerOrder.splice(index, 1);
    
    // Adjust turn index if needed
    if (turnState.currentTurnIndex >= turnState.playerOrder.length && 
        turnState.playerOrder.length > 0) {
      turnState.currentTurnIndex = turnState.currentTurnIndex % turnState.playerOrder.length;
    }
  }
  
  // Clean up any card effects on this player
  delete turnState.cardEffects[playerId];
}

module.exports = {
  createTurnState,
  getCurrentPlayer,
  getTimeRemaining,
  checkTurnAdvance,
  advanceTurn,
  applyCardEffect,
  getActiveEffect,
  cleanupExpiredEffects,
  getActivePlayers,
  removePlayerFromOrder,
};
