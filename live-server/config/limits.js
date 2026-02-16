/**
 * Performance limits and thresholds for Termux optimization
 * All values tuned for low-resource Android environments
 */

module.exports = {
  // Connection limits
  MAX_CONCURRENT_PLAYERS: 30,
  MAX_SESSIONS: 10,
  CONNECTION_TIMEOUT_MS: 30000,
  HEARTBEAT_INTERVAL_MS: 25000,
  HEARTBEAT_TIMEOUT_MS: 60000,

  // Game mechanics
  TURN_TIME_MS: 120000, // 2 minutes per turn
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  ELIMINATION_FAIL_THRESHOLD: 2, // 2 consecutive failed turns

  // Rep validation (anti-cheat)
  MIN_REP_TIME_MS: 800, // Minimum time per rep
  MAX_REP_TIME_MS: 3000, // Maximum realistic time per rep
  MIN_DEPTH_THRESHOLD: 0.6, // Normalized depth (0-1)
  MIN_FORM_SCORE: 0.5, // Normalized form (0-1)
  IDENTICAL_TIMESTAMP_WINDOW_MS: 100, // Reject reps within 100ms
  SUSPICION_THRESHOLD: 5, // Auto-kick after 5 suspicions
  ROLLING_WINDOW_SIZE: 50, // Last 50 reps analyzed

  // Memory optimization
  MESSAGE_POOL_SIZE: 100,
  SESSION_CLEANUP_INTERVAL_MS: 10000,
  MAX_MESSAGE_SIZE_BYTES: 4096,

  // Card deck
  DECK_SIZE: 50,
  DISCARD_PILE_MAX: 100,

  // Memory restart thresholds (PM2)
  LIVE_SERVER_MEMORY_LIMIT_MB: 250,
  BOT_MEMORY_LIMIT_MB: 150,

  // Validation constants
  TIMESTAMP_SKEW_MS: 5000, // Max time difference from server
  MAX_REPS_PER_TURN: 20, // Prevent spam

  // Bot configuration
  BOT_ENABLED: true, // Enable bot players
  BOT_ADD_TIMEOUT_MS: 30000, // Add bots after 30s wait (if 1+ real players)
  BOT_ADD_COUNT: 2, // Add up to 2 bots per session
  BOT_MIN_ACTIVE: 2, // Maintain min bots during active game
  BOT_DIFFICULTY: 'normal', // 'easy', 'normal', 'hard'
};
