/**
 * Rivalis Live Hub Client
 * Connects Rivalis Hub to Live Server for multiplayer fitness game
 * Handles session management, rep submission, and game state synchronization
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class RivalisHubClient extends EventEmitter {
  constructor(config = {}) {
    super();

    // Connection config
    this.serverUrl = config.serverUrl || 'ws://localhost:8080';
    this.userId = config.userId || null;
    this.firebaseToken = config.firebaseToken || null;

    // Connection state
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || 3000;

    // Session state
    this.sessionId = null;
    this.playerId = null;
    this.isPlaying = false;
    this.currentExercise = null;
    this.sessionState = null;
    this.leaderboard = [];
    this.activeCards = [];

    // Heartbeat
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;

    // Message queue for offline handling
    this.messageQueue = [];
    this.maxQueueSize = 100;
  }

  /**
   * Connect to Live Server
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[HubClient] Connecting to ${this.serverUrl}`);

        this.ws = new WebSocket(this.serverUrl);

        this.ws.on('open', () => {
          console.log('[HubClient] Connected to Live Server');
          this.connected = true;
          this.reconnectAttempts = 0;

          // Send authentication
          this.authenticate();

          // Start heartbeat
          this.startHeartbeat();

          // Process queued messages
          this.processMessageQueue();

          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('[HubClient] Failed to parse message:', error.message);
          }
        });

        this.ws.on('error', (error) => {
          console.error('[HubClient] WebSocket error:', error.message);
          this.connected = false;
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('[HubClient] Disconnected from Live Server');
          this.connected = false;
          this.stopHeartbeat();
          this.emit('disconnected');
          this.attemptReconnect();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[HubClient] Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[HubClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[HubClient] Reconnection failed:', error.message);
      });
    }, delay);
  }

  /**
   * Authenticate with server
   */
  authenticate() {
    this.send({
      message_type: 'authenticate',
      userId: this.userId,
      firebaseToken: this.firebaseToken,
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.send({ message_type: 'ping' });
      }
    }, 25000);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Send message to server (queues if offline)
   */
  send(message) {
    if (!this.connected) {
      // Queue message for later
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message);
        console.log(`[HubClient] Queued message (queue size: ${this.messageQueue.length})`);
      }
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[HubClient] Failed to send message:', error.message);
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Process queued messages when reconnected
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`[HubClient] Processing ${this.messageQueue.length} queued messages`);
    const queue = this.messageQueue.splice(0);

    queue.forEach((message) => {
      this.send(message);
    });
  }

  /**
   * Join a session
   */
  joinSession(sessionId) {
    console.log(`[HubClient] Joining session: ${sessionId}`);
    this.send({
      message_type: 'join_session',
      sessionId,
    });
  }

  /**
   * Leave current session
   */
  leaveSession() {
    if (!this.sessionId) return;

    console.log(`[HubClient] Leaving session: ${this.sessionId}`);
    this.send({
      message_type: 'leave_session',
      sessionId: this.sessionId,
    });

    this.sessionId = null;
    this.playerId = null;
    this.isPlaying = false;
    this.emit('leftSession');
  }

  /**
   * Submit a rep to the server
   * Called by Hub after MediaPipe captures exercise data
   */
  submitRep(repData) {
    if (!this.sessionId || !this.isPlaying) {
      console.warn('[HubClient] Not in active session');
      return;
    }

    // Validate rep data
    if (!repData.exercise || !repData.angles || !repData.distances) {
      console.error('[HubClient] Invalid rep data:', repData);
      return;
    }

    const message = {
      message_type: 'submit_rep',
      sessionId: this.sessionId,
      playerId: this.playerId,
      exercise: repData.exercise,
      angles: repData.angles,
      distances: repData.distances,
      visibility: repData.visibility || 0.5,
      repTimeMs: repData.repTimeMs || 1500,
      timestamp: repData.timestamp || Date.now(),
      formScore: repData.formScore || 0.7,
      depth: repData.depth || 0.7,
    };

    this.send(message);
  }

  /**
   * Get session status
   */
  getSessionStatus() {
    this.send({
      message_type: 'get_status',
      sessionId: this.sessionId,
    });
  }

  /**
   * Advance to next turn manually
   */
  advanceTurn() {
    if (!this.sessionId) return;

    this.send({
      message_type: 'advance_turn',
      sessionId: this.sessionId,
    });
  }

  /**
   * Handle messages from server
   */
  handleServerMessage(message) {
    const { message_type } = message;

    switch (message_type) {
      case 'pong':
        // Heartbeat response
        break;

      case 'authenticated':
        console.log('[HubClient] Authenticated successfully');
        this.playerId = message.playerId;
        this.emit('authenticated', message);
        break;

      case 'session_joined':
        console.log('[HubClient] Joined session:', message.sessionId);
        this.sessionId = message.sessionId;
        this.playerId = message.playerId;
        this.currentExercise = message.currentExercise;
        this.activeCards = message.activeCards || [];
        this.emit('sessionJoined', {
          sessionId: this.sessionId,
          playerId: this.playerId,
          currentExercise: this.currentExercise,
          players: message.players,
        });
        break;

      case 'session_left':
        console.log('[HubClient] Left session');
        this.sessionId = null;
        this.isPlaying = false;
        this.emit('sessionLeft');
        break;

      case 'session_started':
        console.log('[HubClient] Session started');
        this.isPlaying = true;
        this.currentExercise = message.currentExercise;
        this.emit('sessionStarted', {
          currentExercise: this.currentExercise,
          currentPlayer: message.currentPlayer,
          turnExpiry: message.turnExpiry,
        });
        break;

      case 'rep_processed':
        // Emit rep result for UI feedback
        this.emit('repProcessed', {
          repsAdded: message.repsAdded,
          scoreAdded: message.scoreAdded,
          formScore: message.formScore,
          depth: message.depth,
          isValid: message.isValid,
          reason: message.reason,
        });
        break;

      case 'turn_advanced':
        console.log('[HubClient] Turn advanced');
        this.currentExercise = message.currentExercise;
        this.activeCards = message.activeCards || [];
        this.emit('turnAdvanced', {
          currentPlayer: message.currentPlayer,
          currentExercise: this.currentExercise,
          turnNumber: message.turnNumber,
          activeCards: this.activeCards,
        });
        break;

      case 'leaderboard_updated':
        this.leaderboard = message.leaderboard || [];
        this.emit('leaderboardUpdated', this.leaderboard);
        break;

      case 'player_eliminated':
        console.log(`[HubClient] Player eliminated: ${message.playerId}`);
        this.emit('playerEliminated', {
          playerId: message.playerId,
          playerName: message.playerName,
          reason: message.reason,
        });
        break;

      case 'session_ended':
        console.log('[HubClient] Session ended');
        this.isPlaying = false;
        this.emit('sessionEnded', {
          winner: message.winner,
          finalLeaderboard: message.leaderboard,
        });
        break;

      case 'card_drawn':
        console.log(`[HubClient] Card drawn: ${message.cardName}`);
        this.emit('cardDrawn', {
          cardId: message.cardId,
          cardName: message.cardName,
          effect: message.effect,
        });
        break;

      case 'card_applied':
        console.log(`[HubClient] Card applied: ${message.cardName}`);
        this.activeCards = message.activeCards || [];
        this.emit('cardApplied', {
          cardId: message.cardId,
          cardName: message.cardName,
          targetPlayer: message.targetPlayer,
          effect: message.effect,
        });
        break;

      case 'error':
        console.error('[HubClient] Server error:', message.reason);
        this.emit('serverError', message);
        break;

      default:
        console.warn('[HubClient] Unknown message type:', message_type);
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    console.log('[HubClient] Disconnecting from Live Server');
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * Get current player state
   */
  getPlayerState() {
    return {
      sessionId: this.sessionId,
      playerId: this.playerId,
      isPlaying: this.isPlaying,
      currentExercise: this.currentExercise,
      activeCards: this.activeCards,
      leaderboard: this.leaderboard,
    };
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return {
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
      messageQueueSize: this.messageQueue.length,
    };
  }
}

module.exports = RivalisHubClient;
