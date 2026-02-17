/**
 * Session Manager (Minimal) - Only session lifecycle, no game logic
 * Game logic is handled by Hub
 */

const { v4: uuidv4 } = require('uuid');

// In-memory sessions pool
const sessions = new Map();

/**
 * Create a new session
 * @param {Object} params - { gameMode, exerciseName, hubSessionId }
 * @returns {Object} session object
 */
function createSession(params = {}) {
  const sessionId = uuidv4();
  
  const session = {
    id: sessionId,
    createdAt: new Date().toISOString(),
    status: 'waiting', // waiting, active, ended
    gameMode: params.gameMode || 'standard',
    exerciseName: params.exerciseName || null,
    hubSessionId: params.hubSessionId || null, // Link to Hub's session ID
    discordVC: null, // Will be populated by server.js
    startedAt: null,
    endedAt: null,
    endReason: null,
    winner: null,
    stats: null,
  };

  sessions.set(sessionId, session);
  
  console.log(`✅ Session created: ${sessionId} (mode: ${session.gameMode})`);
  return session;
}

/**
 * Get session by ID
 * @param {String} sessionId
 * @returns {Object|undefined} session object or undefined
 */
function getSession(sessionId) {
  return sessions.get(sessionId);
}

/**
 * Get all active sessions (not ended)
 * @returns {Array} array of session objects
 */
function getActiveSessions() {
  return Array.from(sessions.values()).filter(s => s.status !== 'ended');
}

/**
 * Remove session from memory
 * @param {String} sessionId
 * @returns {Boolean} true if removed, false if not found
 */
function removeSession(sessionId) {
  const existed = sessions.has(sessionId);
  sessions.delete(sessionId);
  if (existed) {
    console.log(`🗑️ Session removed: ${sessionId}`);
  }
  return existed;
}

/**
 * Update session status
 * @param {String} sessionId
 * @param {String} status - 'waiting', 'active', or 'ended'
 * @returns {Object} updated session or null if not found
 */
function updateSessionStatus(sessionId, status) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  session.status = status;
  
  if (status === 'active' && !session.startedAt) {
    session.startedAt = new Date().toISOString();
  }
  
  if (status === 'ended' && !session.endedAt) {
    session.endedAt = new Date().toISOString();
  }
  
  return session;
}

/**
 * Get session statistics
 * @returns {Object} stats object
 */
function getStats() {
  const allSessions = Array.from(sessions.values());
  
  return {
    total: allSessions.length,
    waiting: allSessions.filter(s => s.status === 'waiting').length,
    active: allSessions.filter(s => s.status === 'active').length,
    ended: allSessions.filter(s => s.status === 'ended').length,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  };
}

module.exports = {
  createSession,
  getSession,
  getActiveSessions,
  removeSession,
  updateSessionStatus,
  getStats,
};
