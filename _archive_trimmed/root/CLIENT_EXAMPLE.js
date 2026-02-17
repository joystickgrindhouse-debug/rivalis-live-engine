/**
 * Rivalis Live - Client Connection Example
 * Shows how to connect to the WebSocket server with Firebase authentication
 * Works in both web browsers and Node.js environments
 */

class RivalisClient {
  constructor(serverUrl, idToken) {
    this.serverUrl = serverUrl;
    this.idToken = idToken;
    this.ws = null;
    this.sessionId = null;
    this.playerId = null;
  }

  /**
   * Connect to WebSocket server with authentication
   */
  async connect() {
    try {
      console.log('🔗 Connecting to Rivalis Live...');

      const wsUrl = this.serverUrl.replace('http', 'ws');
      
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.idToken}`,
        },
      });

      this.ws.onopen = () => {
        console.log('✅ Connected to Rivalis Live');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this._handleMessage(message);
        } catch (error) {
          console.error('⚠️ Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('🔥 WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from Rivalis Live');
      };

      return new Promise((resolve, reject) => {
        this.ws.onopen = () => {
          console.log('✅ Connected to Rivalis Live');
          resolve();
        };
        this.ws.onerror = reject;
      });
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  _handleMessage(message) {
    console.log('📨 Message:', message.type);

    switch (message.type) {
      case 'player_joined':
        this.playerId = message.playerId;
        this.sessionId = message.sessionId;
        console.log(`✅ Joined session: ${this.sessionId} as ${message.playerId}`);
        break;

      case 'rep_result':
        if (message.valid) {
          console.log(`✅ Rep accepted! +${message.repData.repsAdded} reps, +${message.repData.scoreAdded} points`);
        } else {
          console.log(`❌ Rep rejected: ${message.error}`);
        }
        break;

      case 'turn_advanced':
        console.log(`⏭️ Turn advanced to #${message.turnNumber}`);
        console.log(`🎮 Current player: ${message.currentPlayer}`);
        if (message.drawnCard) {
          console.log(`🎴 Card drawn: ${message.drawnCard.type}`);
        }
        break;

      case 'player_update':
        console.log(`👤 Player update: ${message.playerName} ${message.action}`);
        break;

      case 'player_rep_submitted':
        console.log(`💪 ${message.playerId} submitted rep! +${message.repData.repsAdded}`);
        break;

      case 'session_status':
        console.log('📊 Session status:', message.stats);
        console.log('🏆 Leaderboard:', message.leaderboard);
        break;

      case 'error':
        console.error(`❌ Error: ${message.error}`);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Join a session
   */
  joinSession(sessionId, playerName) {
    this.sessionId = sessionId;

    const message = {
      type: 'join_session',
      sessionId,
      playerName,
    };

    this._send(message);
  }

  /**
   * Submit a rep
   */
  submitRep(depth, formScore, repTimeMs) {
    if (!this.sessionId) {
      console.error('Not in a session');
      return;
    }

    const message = {
      type: 'submit_rep',
      rep: {
        depth: Math.min(1, Math.max(0, depth)), // Clamp 0-1
        formScore: Math.min(1, Math.max(0, formScore)), // Clamp 0-1
        repTimeMs: Math.max(0, repTimeMs),
        timestamp: Date.now(),
      },
    };

    this._send(message);
  }

  /**
   * Get session status
   */
  getSessionStatus() {
    const message = {
      type: 'get_session_status',
    };

    this._send(message);
  }

  /**
   * Leave session
   */
  leaveSession() {
    const message = {
      type: 'leave_session',
    };

    this._send(message);
    this.sessionId = null;
  }

  /**
   * Send message over WebSocket
   */
  _send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============= USAGE EXAMPLE =============

/**
 * Example: Connect and join a session
 */
async function exampleUsage() {
  // Initialize client
  const client = new RivalisClient('http://localhost:8080', 'your_firebase_id_token');

  // Connect to server
  await client.connect();

  // Join a session
  client.joinSession('session-uuid', 'Player Name');

  // Submit some reps (after a delay to ensure connection is ready)
  setTimeout(() => {
    // Simulate rep: depth=0.85, form=0.92, time=1200ms
    client.submitRep(0.85, 0.92, 1200);

    // Another rep
    setTimeout(() => {
      client.submitRep(0.80, 0.88, 1150);
    }, 2000);

    // Get status
    setTimeout(() => {
      client.getSessionStatus();
    }, 4000);
  }, 1000);

  // Disconnect after 10 seconds
  setTimeout(() => {
    client.disconnect();
  }, 10000);
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RivalisClient;
}
