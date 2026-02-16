/**
 * WebSocket Socket Handler
 * Manages client connections, message routing, and graceful disconnection
 * Prevents memory leaks and handles malformed messages safely
 */

const sessionManager = require('../game/sessionManager');
const LIMITS = require('../config/limits');

/**
 * Attach WebSocket handlers to client socket
 */
function attachSocketHandlers(socket, userId) {
  let sessionId = null;
  let isAlive = true;

  // Ping/Pong heartbeat
  socket.isAlive = true;
  socket.on('pong', () => {
    socket.isAlive = true;
  });

  /**
   * Join session
   */
  socket.on('message', (rawMessage) => {
    try {
      // Safety: check message size
      if (rawMessage.length > LIMITS.MAX_MESSAGE_SIZE_BYTES) {
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Message too large',
        }));
        return;
      }

      // Parse message safely
      let message;
      try {
        message = JSON.parse(rawMessage.toString());
      } catch (parseError) {
        console.warn(`⚠️ Malformed JSON from ${userId}:`, parseError.message.substring(0, 50));
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Invalid JSON',
        }));
        return;
      }

      // Route message based on type
      if (!message.type) {
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Missing message type',
        }));
        return;
      }

      // Handle message types
      switch (message.type) {
        case 'join_session':
          handleJoinSession(socket, userId, message, (sId) => { sessionId = sId; });
          break;

        case 'submit_rep':
          handleSubmitRep(socket, userId, sessionId, message);
          break;

        case 'advance_turn':
          handleAdvanceTurn(socket, userId, sessionId, message);
          break;

        case 'get_session_status':
          handleGetSessionStatus(socket, userId, sessionId);
          break;

        case 'leave_session':
          handleLeaveSession(socket, userId, sessionId, (sId) => { sessionId = sId; });
          break;

        default:
          socket.send(JSON.stringify({
            type: 'error',
            error: `Unknown message type: ${message.type}`,
          }));
      }
    } catch (error) {
      console.error(`🔥 Error processing message from ${userId}:`, error.message);
      try {
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Internal server error',
        }));
      } catch (sendError) {
        // Socket might be closed
      }
    }
  });

  /**
   * Handle disconnect
   */
  socket.on('close', () => {
    console.log(`🔌 Socket closed for ${userId}`);

    // Clean up session
    if (sessionId) {
      sessionManager.removePlayerFromSession(sessionId, userId);
    }

    // Remove all listeners to prevent memory leaks
    socket.removeAllListeners();
    socket = null;
  });

  /**
   * Handle socket errors
   */
  socket.on('error', (error) => {
    console.warn(`⚠️ Socket error for ${userId}:`, error.message.substring(0, 100));
  });

  return { userId, sessionId };
}

/**
 * Handle join session message
 */
function handleJoinSession(socket, userId, message, setSessionId) {
  const { sessionId, playerName } = message;

  if (!sessionId) {
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Missing sessionId',
    }));
    return;
  }

  const result = sessionManager.addPlayerToSession(sessionId, userId, playerName);

  if (result.error) {
    socket.send(JSON.stringify({
      type: 'error',
      error: result.error,
    }));
    return;
  }

  // Store player reference for later communication
  result.socket = socket;
  sessionManager.getSession(sessionId).players[userId].socket = socket;

  setSessionId(sessionId);

  socket.send(JSON.stringify({
    type: 'player_joined',
    playerId: userId,
    sessionId,
    message: `Welcome ${result.name}!`,
  }));

  // Notify other players
  broadcastToSession(sessionId, {
    type: 'player_update',
    playerId: userId,
    playerName: result.name,
    action: 'joined',
  }, userId);
}

/**
 * Handle submit rep message
 */
function handleSubmitRep(socket, userId, sessionId, message) {
  if (!sessionId) {
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Not in a session',
    }));
    return;
  }

  const { rep } = message;
  if (!rep) {
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Missing rep data',
    }));
    return;
  }

  const result = sessionManager.submitRep(sessionId, userId, rep);

  socket.send(JSON.stringify({
    type: 'rep_result',
    valid: result.valid,
    error: result.error,
    repData: result.repData,
  }));

  if (result.valid) {
    // Notify other players of the rep
    broadcastToSession(sessionId, {
      type: 'player_rep_submitted',
      playerId: userId,
      repData: result.repData,
    });
  }
}

/**
 * Handle advance turn message (admin/server initiated)
 */
function handleAdvanceTurn(socket, userId, sessionId, message) {
  if (!sessionId) {
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Not in a session',
    }));
    return;
  }

  const result = sessionManager.advanceTurnInSession(sessionId);

  if (result.error) {
    socket.send(JSON.stringify({
      type: 'error',
      error: result.error,
    }));
    return;
  }

  // Broadcast turn advance to all players
  broadcastToSession(sessionId, {
    type: 'turn_advanced',
    turnNumber: result.turnNumber,
    currentPlayer: result.currentPlayer,
    drawnCard: result.drawnCard,
  });
}

/**
 * Handle get session status
 */
function handleGetSessionStatus(socket, userId, sessionId) {
  if (!sessionId) {
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Not in a session',
    }));
    return;
  }

  const stats = sessionManager.getSessionStats(sessionId);
  const leaderboard = repEngine.calculateLeaderboard(sessionManager.getSession(sessionId).players);

  socket.send(JSON.stringify({
    type: 'session_status',
    stats,
    leaderboard,
  }));
}

/**
 * Handle leave session
 */
function handleLeaveSession(socket, userId, sessionId, setSessionId) {
  if (sessionId) {
    sessionManager.removePlayerFromSession(sessionId, userId);
    setSessionId(null);
  }

  socket.send(JSON.stringify({
    type: 'player_left_session',
    message: 'You left the session',
  }));
}

/**
 * Broadcast message to all players in a session
 */
function broadcastToSession(sessionId, message, excludeUserId = null) {
  const session = sessionManager.getSession(sessionId);
  if (!session) return;

  const messageStr = JSON.stringify(message);

  for (const playerId in session.players) {
    if (excludeUserId && playerId === excludeUserId) continue;

    const player = session.players[playerId];
    if (player && player.socket && player.socket.readyState === 1) { // 1 = OPEN
      try {
        player.socket.send(messageStr);
      } catch (error) {
        console.warn(`⚠️ Failed to send message to ${playerId}:`, error.message.substring(0, 50));
      }
    }
  }
}

/**
 * Heartbeat check (remove dead sockets)
 */
function heartbeatCheck(wss) {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) {
      try {
        socket.terminate();
      } catch (e) {
      }
      return;
    }

    socket.isAlive = false;
    socket.ping();
  });
}

module.exports = {
  attachSocketHandlers,
  broadcastToSession,
  heartbeatCheck,
};
