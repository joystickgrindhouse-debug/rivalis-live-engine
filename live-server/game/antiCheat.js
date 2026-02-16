/**
 * Anti-Cheat Rep Validation Engine
 * Analyzes rep submissions using exercise-specific thresholds and pattern detection
 * No rep history stored, only rolling window of suspicion scores
 */

const LIMITS = require('../config/limits');
const exercisesConfig = require('../config/exercises');

/**
 * Initialize anti-cheat state for a player
 * Minimal memory footprint
 */
function createPlayerAntiCheat() {
  return {
    suspicionScore: 0,
    recentReps: [], // Rolling window, max ROLLING_WINDOW_SIZE
    lastRepTimestamp: 0,
  };
}

/**
 * Validate a rep submission against exercise-specific thresholds
 * Returns { valid: boolean, reason?: string }
 */
function validateRep(rep, antiCheatState, serverTime, exerciseName = 'pushups') {
  // Check structure
  if (!rep || typeof rep !== 'object') {
    return { valid: false, reason: 'Invalid rep object' };
  }

  const { depth, formScore, repTimeMs, timestamp } = rep;

  // Type validation
  if (typeof depth !== 'number' || typeof formScore !== 'number' ||
      typeof repTimeMs !== 'number' || typeof timestamp !== 'number') {
    return { valid: false, reason: 'Invalid rep data types' };
  }

  // Range validation
  if (depth < 0 || depth > 1 || formScore < 0 || formScore > 1) {
    return { valid: false, reason: 'Depth/form out of range [0-1]' };
  }

  // Get exercise-specific thresholds
  const exerciseThresholds = exercisesConfig.getThresholds(exerciseName);
  if (!exerciseThresholds) {
    // Fallback to defaults if exercise not found
    exerciseThresholds = {
      minFormScore: LIMITS.MIN_FORM_SCORE,
      minDepth: LIMITS.MIN_DEPTH_THRESHOLD,
      maxRepTimeMs: LIMITS.MAX_REP_TIME_MS,
      minRepTimeMs: LIMITS.MIN_REP_TIME_MS,
    };
  }

  // Time validation (exercise-specific)
  if (repTimeMs < exerciseThresholds.minRepTimeMs || repTimeMs > exerciseThresholds.maxRepTimeMs) {
    return {
      valid: false,
      reason: `Rep time outside ${exerciseThresholds.minRepTimeMs}-${exerciseThresholds.maxRepTimeMs}ms for ${exerciseName}`,
    };
  }

  // Depth threshold (exercise-specific)
  if (depth < exerciseThresholds.minDepth) {
    return { valid: false, reason: `Depth below minimum ${exerciseThresholds.minDepth} for ${exerciseName}` };
  }

  // Form threshold (exercise-specific)
  if (formScore < exerciseThresholds.minFormScore) {
    return { valid: false, reason: `Form below minimum ${exerciseThresholds.minFormScore} for ${exerciseName}` };
  }

  // Client timestamp validation (prevent old/future submissions)
  const timeDiff = Math.abs(serverTime - timestamp);
  if (timeDiff > LIMITS.TIMESTAMP_SKEW_MS) {
    return { valid: false, reason: `Timestamp skew too large: ${timeDiff}ms` };
  }

  // Identical timestamp check (prevent replay)
  if (antiCheatState.lastRepTimestamp !== 0 &&
      Math.abs(timestamp - antiCheatState.lastRepTimestamp) < LIMITS.IDENTICAL_TIMESTAMP_WINDOW_MS) {
    return { valid: false, reason: 'Suspiciously identical timestamp' };
  }

  // Pattern detection on rolling window
  const suspicion = detectSuspiciousPattern(rep, antiCheatState.recentReps, exerciseName);
  
  // Add suspicion score
  antiCheatState.suspicionScore += suspicion;

  // Auto-kick threshold
  if (antiCheatState.suspicionScore >= LIMITS.SUSPICION_THRESHOLD) {
    return { valid: false, reason: `Suspicion threshold exceeded: ${antiCheatState.suspicionScore}` };
  }

  // Update rolling window
  updateRollingWindow(antiCheatState, rep);

  return { valid: true };
}

/**
 * Detect suspicious patterns in rep submission
 * Exercise-specific detection for cheating indicators
 * Returns suspicion points (0-2)
 */
function detectSuspiciousPattern(currentRep, recentReps, exerciseName = 'pushups') {
  if (recentReps.length === 0) return 0;

  let suspicion = 0;
  const lastRep = recentReps[recentReps.length - 1];

  // Get exercise-specific thresholds
  const exerciseThresholds = exercisesConfig.getThresholds(exerciseName);
  const minRepTime = exerciseThresholds ? exerciseThresholds.minRepTimeMs : LIMITS.MIN_REP_TIME_MS;

  // Check time between reps (too fast - different per exercise)
  const timeSinceLastRep = currentRep.timestamp - lastRep.timestamp;
  if (timeSinceLastRep < minRepTime * 0.5) {  // < 50% of min time
    suspicion += 1; // Too fast for exercise type
  }

  // Check for unnaturally consistent perfect forms (possible bot/autoclicker)
  if (currentRep.formScore >= 0.95 && lastRep.formScore >= 0.95) {
    if (recentReps.length >= 5) {
      const lastFiveFormScores = recentReps.slice(-5).map(r => r.formScore);
      if (lastFiveFormScores.every(s => s >= 0.95)) {
        suspicion += 1; // Too perfect too consistently
      }
    }
  }

  // Check for depth inconsistency (sudden drops might indicate form break)
  if (currentRep.depth < 0.5 && lastRep.depth >= 0.8) {
    suspicion += 1; // Suspicious depth drop
  }

  // Exercise-specific patterns
  if (exerciseName.includes('plank')) {
    // Planks should have consistent depth (isometric)
    if (recentReps.length >= 3) {
      const lastThreeDepths = recentReps.slice(-3).map(r => r.depth);
      const depthVariation = Math.max(...lastThreeDepths) - Math.min(...lastThreeDepths);
      if (depthVariation > 0.3) {
        suspicion += 1; // Too much variation for static hold
      }
    }
  }

  if (exerciseName.includes('jumps') || exerciseName.includes('high_knees')) {
    // Dynamic exercises should have faster submissions
    if (timeSinceLastRep < 300) {
      suspicion += 0.5; // Unlikely to complete so fast
    }
  }

  return Math.min(suspicion, 2); // Cap at 2 points per rep
}

/**
 * Update rolling window with new rep
 */
function updateRollingWindow(antiCheatState, rep) {
  antiCheatState.recentReps.push(rep);
  
  // Trim to window size
  if (antiCheatState.recentReps.length > LIMITS.ROLLING_WINDOW_SIZE) {
    antiCheatState.recentReps = antiCheatState.recentReps.slice(-LIMITS.ROLLING_WINDOW_SIZE);
  }

  antiCheatState.lastRepTimestamp = rep.timestamp;
}

/**
 * Decay suspicion score over time (forgive old infractions)
 */
function decaySuspicion(antiCheatState) {
  // Reduce suspicion by 1 per turn (max decay)
  antiCheatState.suspicionScore = Math.max(0, antiCheatState.suspicionScore - 1);
}

/**
 * Reset player anti-cheat state (e.g., on session end)
 */
function resetAntiCheat(antiCheatState) {
  antiCheatState.suspicionScore = 0;
  antiCheatState.recentReps = [];
  antiCheatState.lastRepTimestamp = 0;
}

module.exports = {
  createPlayerAntiCheat,
  validateRep,
  detectSuspiciousPattern,
  decaySuspicion,
  resetAntiCheat,
};
