/**
 * Rep Engine - Rep counting, scoring, and card effect application
 * Integrates pose validation, exercise thresholds, and card multipliers
 */

const LIMITS = require('../config/limits');
const poseValidator = require('./poseValidator');
const cardValues = require('../config/cardValues');
const exercisesConfig = require('../config/exercises');

/**
 * Initialize player rep state
 */
function createPlayerRepState() {
  return {
    totalReps: 0,
    sessionScore: 0,
    lastRepTime: 0,
  };
}

/**
 * Process a rep submission with exercise validation and card effects
 * Returns { repsAdded, scoreAdded, formScore, depth, isValid, reason }
 */
function processRep(rep, exerciseName, activeCards = [], currentTurn = 0, playerId = null) {
  // Validate exercise exists
  if (!exercisesConfig.isValidExercise(exerciseName)) {
    return {
      repsAdded: 0,
      scoreAdded: 0,
      isValid: false,
      reason: `Unknown exercise: ${exerciseName}`,
    };
  }

  // Validate rep form against exercise reference
  const validation = poseValidator.validateRepForm(rep, exerciseName);
  
  if (!validation.isValid) {
    return {
      repsAdded: 0,
      scoreAdded: 0,
      formScore: validation.formScore,
      depth: validation.depth,
      isValid: false,
      reason: validation.reason,
    };
  }

  // Rep is valid - calculate multipliers
  let repsAdded = 1;
  let scoreAdded = 100; // Base score per rep

  // Apply exercise-specific minimum scores
  const exerciseThresholds = exercisesConfig.getThresholds(exerciseName);
  const formQuality = validation.formScore;
  const depthQuality = validation.depth;

  // Quality bonus: better form/depth = more points
  // Max 2x multiplier for perfect execution
  const qualityBonus = 1 + (formQuality * 0.6) + (depthQuality * 0.4);
  scoreAdded = Math.floor(scoreAdded * qualityBonus);

  // Apply card effects if any active
  if (Array.isArray(activeCards) && playerId) {
    // Double reps card
    if (cardValues.isCardActive(activeCards.find(c => c.cardId === 'DOUBLE_REPS' && c.targetPlayerId === playerId), currentTurn)) {
      const doubleCard = activeCards.find(c => c.cardId === 'DOUBLE_REPS' && c.targetPlayerId === playerId);
      if (doubleCard) {
        repsAdded *= doubleCard.repMultiplier;
        scoreAdded = Math.floor(scoreAdded * doubleCard.repMultiplier);
      }
    }

    // Form penalty card (makes rep easier - lower form requirement)
    const formPenalty = cardValues.getFormPenalty(playerId, activeCards, currentTurn);
    if (formPenalty > 0) {
      // Apply penalty: reduce score when form penalty is active
      scoreAdded = Math.floor(scoreAdded * (1 - formPenalty * 0.5));
    }
  }

  // Ensure minimum score
  scoreAdded = Math.max(scoreAdded, 10);

  return {
    repsAdded,
    scoreAdded,
    formScore: validation.formScore,
    depth: validation.depth,
    visibility: validation.visibility,
    exercise: exerciseName,
    isValid: true,
  };
}

/**
 * Update player stats after rep submission
 */
function updatePlayerStats(playerRepState, rep, exerciseName, activeCards = [], currentTurn = 0, playerId = null) {
  const processed = processRep(rep, exerciseName, activeCards, currentTurn, playerId);

  if (processed.isValid) {
    playerRepState.totalReps += processed.repsAdded;
    playerRepState.sessionScore += processed.scoreAdded;
    playerRepState.lastRepTime = rep.timestamp;
  }

  return processed;
}

/**
 * Get player statistics
 */
function getPlayerStats(playerRepState) {
  return {
    totalReps: playerRepState.totalReps,
    sessionScore: playerRepState.sessionScore,
    lastRepTime: playerRepState.lastRepTime,
  };
}

/**
 * Reset rep state for new session
 */
function resetRepState(playerRepState) {
  playerRepState.totalReps = 0;
  playerRepState.sessionScore = 0;
  playerRepState.lastRepTime = 0;
}

/**
 * Calculate session leaderboard (minimal memory)
 * Input: players object { playerId: { repState } }
 * Returns: sorted array of { playerId, totalReps, sessionScore }
 */
function calculateLeaderboard(playersObj) {
  const leaderboard = [];

  for (const playerId in playersObj) {
    const player = playersObj[playerId];
    if (player && player.repState) {
      leaderboard.push({
        playerId,
        totalReps: player.repState.totalReps,
        sessionScore: player.repState.sessionScore,
      });
    }
  }

  // Sort by score descending
  return leaderboard.sort((a, b) => b.sessionScore - a.sessionScore);
}

module.exports = {
  createPlayerRepState,
  processRep,
  updatePlayerStats,
  getPlayerStats,
  resetRepState,
  calculateLeaderboard,
};
