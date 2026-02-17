/**
 * Elimination Engine
 * Tracks consecutive rep failures and eliminates players
 * Eliminated players become spectators
 */

const LIMITS = require('../config/limits');

/**
 * Initialize player elimination state
 */
function createPlayerElimination() {
  return {
    consecutiveFailures: 0,
    eliminated: false,
    spectatorSince: null,
  };
}

/**
 * Record a rep submission result
 * Returns { eliminated: boolean, spectator: boolean }
 */
function recordRepResult(eliminationState, success) {
  if (eliminationState.eliminated) {
    // Can't record for eliminated players
    return { eliminated: true, spectator: true };
  }

  if (success) {
    // Reset failure counter on successful rep
    eliminationState.consecutiveFailures = 0;
  } else {
    // Increment failure counter
    eliminationState.consecutiveFailures += 1;

    // Check elimination threshold
    if (eliminationState.consecutiveFailures >= LIMITS.ELIMINATION_FAIL_THRESHOLD) {
      eliminationState.eliminated = true;
      eliminationState.spectatorSince = Date.now();
      return { eliminated: true, spectator: true };
    }
  }

  return { eliminated: false, spectator: false };
}

/**
 * Check if a player is still active (not eliminated)
 */
function isPlayerActive(eliminationState) {
  return !eliminationState.eliminated;
}

/**
 * Get player status string (for logging/debugging)
 */
function getPlayerStatus(eliminationState) {
  if (eliminationState.eliminated) {
    return `SPECTATOR (since ${eliminationState.spectatorSince})`;
  }
  return `ACTIVE (failures: ${eliminationState.consecutiveFailures})`;
}

/**
 * Reset elimination state for new session
 */
function resetElimination(eliminationState) {
  eliminationState.consecutiveFailures = 0;
  eliminationState.eliminated = false;
  eliminationState.spectatorSince = null;
}

module.exports = {
  createPlayerElimination,
  recordRepResult,
  isPlayerActive,
  getPlayerStatus,
  resetElimination,
};
