/**
 * RIVALIS HUB - TERMUX LIVE SERVER INTEGRATION
 * 
 * Add this to your Vercel Hub to connect to your Termux Live Server
 * 
 * File: src/services/liveServerClient.js (or similar)
 */

class LiveServerClient extends EventTarget {
  constructor(config = {}) {
    super();

    // Get server URL from environment or use default
    this.serverUrl = config.serverUrl || 
                     process.env.REACT_APP_LIVE_SERVER_URL ||
                     localStorage.getItem('liveServerUrl') ||
                     'ws://192.168.1.100:8080'; // Default local IP

    this.userId = config.userId || localStorage.getItem('userId');
    this.firebaseToken = config.firebaseToken || localStorage.getItem('firebaseToken');

    // Connection state
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;

    // Game state
    this.sessionId = null;
    this.playerId = null;
    this.isPlaying = false;
    this.currentExercise = null;
    this.activeCards = [];
    this.leaderboard = [];

    // Event listeners
    this.listeners = {};

    // Heartbeat
    this.heartbeatInterval = null;

    // Message queue
    this.messageQueue = [];
  }

  /**
   * Register event listener
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    return this;
  }

  /**
   * Emit event
   */
  emit(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in ${eventName}:`, e);
        }
      });
    }
  }

  /**
   * Connect to Termux Live Server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[LiveClient] Connecting to ${this.serverUrl}`);

        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('[LiveClient] ✅ Connected to Live Server');
          this.connected = true;
          this.reconnectAttempts = 0;

          this.authenticate();
          this.startHeartbeat();
          this.processMessageQueue();

          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);
          } catch (e) {
            console.error('Parse error:', e);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[LiveClient] ❌ Connection error');
          this.connected = false;
          this.emit('error', err);
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('[LiveClient] Disconnected');
          this.connected = false;
          this.stopHeartbeat();
          this.emit('disconnected');
          this.attemptReconnect();
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[LiveClient] Max reconnect attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[LiveClient] Reconnecting in ${delay}ms...`);

    setTimeout(() => {
      this.connect().catch(e => console.error('Reconnect error:', e));
    }, delay);
  }

  /**
   * Authenticate
   */
  authenticate() {
    this.send({
      message_type: 'authenticate',
      userId: this.userId,
      firebaseToken: this.firebaseToken,
    });
  }

  /**
   * Heartbeat
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.send({ message_type: 'ping' });
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  /**
   * Send message
   */
  send(message) {
    if (!this.connected) {
      if (this.messageQueue.length < 100) {
        this.messageQueue.push(message);
      }
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('Send error:', e);
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    console.log(`[LiveClient] Processing ${this.messageQueue.length} queued messages`);
    const queue = this.messageQueue.splice(0);
    queue.forEach(msg => this.send(msg));
  }

  /**
   * Join session
   */
  joinSession(sessionId) {
    console.log('[LiveClient] Joining session:', sessionId);
    this.send({
      message_type: 'join_session',
      sessionId,
    });
  }

  /**
   * Leave session
   */
  leaveSession() {
    if (!this.sessionId) return;
    this.send({
      message_type: 'leave_session',
      sessionId: this.sessionId,
    });
    this.sessionId = null;
    this.isPlaying = false;
  }

  /**
   * MAIN: Submit rep from MediaPipe
   */
  submitRep(repData) {
    if (!this.sessionId || !this.isPlaying) {
      console.warn('[LiveClient] Not in active session');
      return false;
    }

    if (!repData.exercise || !repData.angles || !repData.distances) {
      console.error('[LiveClient] Missing required rep fields');
      return false;
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
    return true;
  }

  /**
   * Handle server messages
   */
  handleMessage(msg) {
    const { message_type } = msg;

    switch (message_type) {
      case 'authenticated':
        this.playerId = msg.playerId;
        console.log('[LiveClient] Authenticated as:', this.playerId);
        this.emit('authenticated', msg);
        break;

      case 'session_joined':
        this.sessionId = msg.sessionId;
        this.playerId = msg.playerId;
        this.currentExercise = msg.currentExercise;
        this.activeCards = msg.activeCards || [];
        this.isPlaying = true;
        console.log('[LiveClient] Joined session:', this.sessionId);
        this.emit('sessionJoined', msg);
        break;

      case 'session_started':
        this.isPlaying = true;
        this.currentExercise = msg.currentExercise;
        console.log('[LiveClient] Game started! Exercise:', this.currentExercise);
        this.emit('sessionStarted', msg);
        break;

      case 'rep_processed':
        // Send to UI for real-time feedback
        this.emit('repProcessed', msg);
        break;

      case 'turn_advanced':
        this.currentExercise = msg.currentExercise;
        this.activeCards = msg.activeCards || [];
        console.log('[LiveClient] Turn advanced. Exercise:', this.currentExercise);
        this.emit('turnAdvanced', msg);
        break;

      case 'leaderboard_updated':
        this.leaderboard = msg.leaderboard || [];
        this.emit('leaderboardUpdated', msg);
        break;

      case 'card_drawn':
        this.emit('cardDrawn', msg);
        break;

      case 'card_applied':
        this.activeCards = msg.activeCards || [];
        this.emit('cardApplied', msg);
        break;

      case 'session_ended':
        this.isPlaying = false;
        console.log('[LiveClient] Game ended');
        this.emit('sessionEnded', msg);
        break;

      case 'player_eliminated':
        this.emit('playerEliminated', msg);
        break;

      case 'error':
        console.error('[LiveClient] Server error:', msg.reason);
        this.emit('serverError', msg);
        break;
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      connected: this.connected,
      sessionId: this.sessionId,
      playerId: this.playerId,
      isPlaying: this.isPlaying,
      currentExercise: this.currentExercise,
      activeCards: this.activeCards,
      leaderboard: this.leaderboard,
    };
  }

  /**
   * Configure server URL (useful for settings/debug)
   */
  setServerUrl(url) {
    this.serverUrl = url;
    localStorage.setItem('liveServerUrl', url);
    console.log('[LiveClient] Server URL updated to:', url);
  }
}

// Export for use in Hub
export default LiveServerClient;

// ============================================================
// USAGE EXAMPLE IN YOUR HUB
// ============================================================

/*

// In your multiplayer game component:

import LiveServerClient from './services/liveServerClient';

function MultiplayerGame() {
  const [client] = useState(null);
  const [gameState, setGameState] = useState({});

  // Initialize on mount
  useEffect(() => {
    const liveClient = new LiveServerClient({
      serverUrl: 'ws://192.168.1.100:8080', // Your Termux IP
      userId: localStorage.getItem('userId'),
    });

    // Setup event listeners
    liveClient.on('connected', () => {
      console.log('Connected to Live Server!');
      setGameState(prev => ({ ...prev, connected: true }));
    });

    liveClient.on('sessionJoined', (data) => {
      console.log('Joined game session');
      setGameState(prev => ({ ...prev, sessionId: data.sessionId }));
    });

    liveClient.on('sessionStarted', (data) => {
      console.log('Game started! Exercise:', data.currentExercise);
      setGameState(prev => ({ ...prev, currentExercise: data.currentExercise }));
    });

    liveClient.on('repProcessed', (result) => {
      if (result.isValid) {
        // Show success feedback
        showNotification(`+${result.repsAdded} reps!`);
        setGameState(prev => ({
          ...prev,
          lastRepScore: result.scoreAdded,
          formScore: result.formScore,
          depth: result.depth,
        }));
      } else {
        // Show error feedback
        showNotification(`Rep rejected: ${result.reason}`);
      }
    });

    liveClient.on('leaderboardUpdated', (data) => {
      setGameState(prev => ({ ...prev, leaderboard: data.leaderboard }));
    });

    // Connect to server
    liveClient.connect();

    return () => {
      liveClient.disconnect();
    };
  }, []);

  // When rep is detected from MediaPipe
  function onRepDetected(repData) {
    if (client && client.connected && client.isPlaying) {
      client.submitRep({
        exercise: repData.exerciseName,
        angles: repData.angles,
        distances: repData.distances,
        visibility: repData.visibility,
        repTimeMs: repData.duration,
        timestamp: Date.now(),
        formScore: repData.formQuality,
        depth: repData.depthQuality,
      });
    }
  }

  // Join a multiplayer session
  function startMultiplayer(sessionId) {
    if (client) {
      client.joinSession(sessionId);
    }
  }

  return (
    <div>
      <h2>Multiplayer Game</h2>
      <p>Connected: {gameState.connected ? '✅' : '❌'}</p>
      <p>Exercise: {gameState.currentExercise}</p>
      <p>Last Rep: {gameState.lastRepScore} points</p>
      <Leaderboard data={gameState.leaderboard} />
    </div>
  );
}

*/
