/**
 * RIVALIS HUB - LIVE SERVER INTEGRATION
 * Place this file in: client/liveclient.js
 * 
 * Connects your Hub to Rivalis Live Server for multiplayer mode
 */

class RivalisLiveClient extends EventTarget {
  constructor(config = {}) {
    super();
    
    // Default config - UPDATE THESE FOR YOUR SETUP
    this.serverUrl = config.serverUrl || 'ws://localhost:8080';
    this.userId = config.userId || localStorage.getItem('userId');
    this.firebaseToken = config.firebaseToken || localStorage.getItem('firebaseToken');
    
    // Connection state
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    
    // Game state
    this.sessionId = null;
    this.playerId = null;
    this.isPlaying = false;
    this.currentExercise = null;
    this.activeCards = [];
    this.leaderboard = [];
    
    // Heartbeat
    this.heartbeatInterval = null;
    
    // Message queue (offline support)
    this.messageQueue = [];
    this.maxQueueSize = 100;
    
    // Event listeners
    this.listeners = {};
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
   * Connect to Live Server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[LiveClient] Connecting to ${this.serverUrl}`);
        
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
          console.log('[LiveClient] ✅ Connected');
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
          console.error('[LiveClient] ❌ Error:', err);
          this.connected = false;
          this.emit('error', err);
          reject(err);
        };
        
        this.ws.onclose = () => {
          console.log('[LiveClient] Lost connection');
          this.connected = false;
          this.stopHeartbeat();
          this.emit('disconnected');
          this.attemptReconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }
  
  /**
   * Reconnect logic
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
      this.connect().catch(e => console.error('Reconnect failed:', e));
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
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Send message
   */
  send(message) {
    if (!this.connected) {
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message);
      }
      return;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('Send error:', e);
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message);
      }
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
    this.playerId = null;
    this.isPlaying = false;
  }
  
  /**
   * Submit rep (MAIN FUNCTION - call this from your MediaPipe detector)
   */
  submitRep(repData) {
    if (!this.sessionId || !this.isPlaying) {
      console.warn('[LiveClient] Not in active session');
      return;
    }
    
    // Validate required fields
    if (!repData.exercise || !repData.angles || !repData.distances) {
      console.error('[LiveClient] Missing required rep fields');
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
   * Handle server messages
   */
  handleMessage(msg) {
    const { message_type } = msg;
    
    switch (message_type) {
      case 'authenticated':
        console.log('[LiveClient] Authenticated:', msg.playerId);
        this.playerId = msg.playerId;
        this.emit('authenticated', msg);
        break;
        
      case 'session_joined':
        console.log('[LiveClient] Joined session:', msg.sessionId);
        this.sessionId = msg.sessionId;
        this.playerId = msg.playerId;
        this.currentExercise = msg.currentExercise;
        this.activeCards = msg.activeCards || [];
        this.isPlaying = true;
        this.emit('sessionJoined', msg);
        break;
        
      case 'session_started':
        this.isPlaying = true;
        this.currentExercise = msg.currentExercise;
        console.log('[LiveClient] Game started! Exercise:', this.currentExercise);
        this.emit('sessionStarted', msg);
        break;
        
      case 'rep_processed':
        this.emit('repProcessed', msg);
        break;
        
      case 'turn_advanced':
        this.currentExercise = msg.currentExercise;
        this.activeCards = msg.activeCards || [];
        console.log('[LiveClient] Turn advanced. New exercise:', this.currentExercise);
        this.emit('turnAdvanced', msg);
        break;
        
      case 'leaderboard_updated':
        this.leaderboard = msg.leaderboard || [];
        this.emit('leaderboardUpdated', msg);
        break;
        
      case 'session_ended':
        this.isPlaying = false;
        console.log('[LiveClient] Game ended');
        this.emit('sessionEnded', msg);
        break;
        
      case 'error':
        console.error('[LiveClient] Server error:', msg.reason);
        this.emit('error', msg);
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
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RivalisLiveClient;
}
