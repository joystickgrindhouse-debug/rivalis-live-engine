/**
 * Rivalis Live - WebSocket Game Engine Server
 * Optimized for Android Termux low-resource environments
 * No clustering, no Redis, all state in-memory
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const { verifyToken, getUserProfile } = require('./auth/verifyFirebase');
const socketHandler = require('./sockets/socketHandler');
const sessionManager = require('./game/sessionManager');
const gameModes = require('./config/gameModes');
const LIMITS = require('./config/limits');
const exerciseReferences = require('./config/exerciseReferences');

// Discord Bot configuration
const DISCORD_BOT_URL = process.env.DISCORD_BOT_URL || 'http://localhost:5000';

// Initialize Express app
const app = express();
const server = http.createServer(app);

// WebSocket server with memory-efficient options
const wss = new WebSocket.Server({
  server,
  perMessageDeflate: false, // Disable compression (CPU intensive)
  clientTracking: true,
});

const PORT = process.env.PORT || 8080;

// ============= MIDDLEWARE =============

app.use(express.json());

// Serve static files from public directory
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Root API overview
app.get('/', (req, res) => {
  const modes = Object.values(gameModes.GAME_MODES).map(m => ({ id: m.id, name: m.name, icon: m.icon }));
  const exercises = exerciseReferences.getAvailableExercises();
  
  res.json({
    name: 'Rivalis Live Engine',
    version: '1.0.0',
    status: 'online',
    gameModesCount: modes.length,
    gameModes: modes,
    exercisesCount: exercises.length,
    exercises: exercises,
    endpoints: {
      health: '/health',
      gameModes: '/game-modes',
      exercises: '/exercises',
      lobby: '/lobby-preview.html',
      results: '/results.html',
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = {
    uptime: process.uptime(),
    activeSessions: sessionManager.getActiveSessions().length,
    totalConnections: wss.clients.size,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  };
  
  res.json(stats);
});

// Results page for end-of-match social images
app.get('/results', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

/**
 * Get available game modes
 */
app.get('/game-modes', (req, res) => {
  const modes = Object.values(gameModes.GAME_MODES).map(mode => ({
    id: mode.id,
    name: mode.name,
    description: mode.description,
    minPlayers: mode.minPlayers,
    maxPlayers: mode.maxPlayers,
    cardDeckEnabled: mode.cardDeckEnabled,
  }));
  
  res.json({
    modes,
    total: modes.length,
  });
});

/**
 * Get specific game mode details
 */
app.get('/game-modes/:modeId', (req, res) => {
  const modeInfo = gameModes.getModeInfo(req.params.modeId);
  
  if (!modeInfo) {
    return res.status(404).json({ error: 'Game mode not found' });
  }
  
  const fullMode = gameModes.getModeByIdOrName(req.params.modeId);
  
  res.json({
    ...modeInfo,
    turnTimeMs: fullMode.turnTimeMs,
    eliminationThreshold: fullMode.eliminationThreshold,
    allowSpectators: fullMode.allowSpectators,
    cardDeckEnabled: fullMode.cardDeckEnabled,
    leaderboardType: fullMode.leaderboardType,
  });
});

// ============= USER PROFILE ENDPOINTS =============

/**
 * Get user profile (requires Firebase auth token)
 */
app.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.substring(7);
    const user = await verifyToken(idToken);
    
    if (!user || !user.uid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const profile = await getUserProfile(user.uid);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============= EXERCISE REFERENCE ENDPOINTS =============

/**
 * Get all available exercises
 */
app.get('/exercises', (req, res) => {
  const exercises = exerciseReferences.getAvailableExercises();
  const detailed = exercises.map(name => exerciseReferences.getExerciseSummary(name));
  
  res.json({
    exercises: detailed,
    total: exercises.length,
  });
});

/**
 * Get reference data for a specific exercise
 */
app.get('/exercises/:exerciseName', (req, res) => {
  const reference = exerciseReferences.getReference(req.params.exerciseName);
  
  if (!reference) {
    const available = exerciseReferences.getAvailableExercises();
    return res.status(404).json({ 
      error: `Exercise not found: ${req.params.exerciseName}`,
      availableExercises: available,
    });
  }
  
  // Return summary + metadata, not full frame data to save bandwidth
  res.json({
    ...exerciseReferences.getExerciseSummary(req.params.exerciseName),
    frameCount: reference.frames.length,
    landmarks: exerciseReferences.getKeyLandmarks(req.params.exerciseName),
  });
});

/**
 * Get full reference frames for an exercise (for client-side validation)
 */
app.get('/exercises/:exerciseName/frames', (req, res) => {
  const frames = exerciseReferences.getFrames(req.params.exerciseName);
  
  if (frames.length === 0) {
    return res.status(404).json({ error: 'Exercise frames not found' });
  }
  
  res.json({
    exercise: req.params.exerciseName,
    frames: frames,
    frameCount: frames.length,
  });
});

/**
 * Score form accuracy against reference
 * Client sends live pose data, server compares against reference
 */
app.post('/exercises/:exerciseName/score-form', express.json(), (req, res) => {
  try {
    const { exerciseName } = req.params;
    const { liveFrame, referenceTimeSeconds } = req.body;

    if (!liveFrame) {
      return res.status(400).json({ error: 'Missing liveFrame data' });
    }

    const referenceFrame = exerciseReferences.getReferenceFrameAtTime(
      exerciseName, 
      referenceTimeSeconds || 0
    );

    if (!referenceFrame) {
      return res.status(404).json({ error: 'Exercise reference not found' });
    }

    const formScore = exerciseReferences.scoreFormAccuracy(
      exerciseName,
      liveFrame,
      referenceFrame
    );

    res.json({
      formScore,
      exercise: exerciseName,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[ExerciseScore] Error:', error.message);
    res.status(500).json({ error: 'Failed to score form', message: error.message });
  }
});

// ============= SESSION ENDPOINTS =============

/**
 * Create new session
 */
app.post('/sessions', express.json(), async (req, res) => {
  try {
    const { gameMode = 'standard', exerciseName } = req.body;

    // Validate game mode exists
    if (!gameModes.isValidMode(gameMode)) {
      return res.status(400).json({ 
        error: `Invalid game mode: ${gameMode}`,
        availableModes: Object.values(gameModes.GAME_MODES).map(m => m.id),
      });
    }

    // Get mode config and apply defaults
    const modeConfig = gameModes.getDefaultSettings(gameMode);
    
    const session = sessionManager.createSession({ 
      gameMode, 
      exerciseName,
      ...modeConfig,
    });

    // Create Discord voice channel
    let discordInfo = null;
    try {
      const vcResponse = await axios.post(`${DISCORD_BOT_URL}/create-vc`, {
        sessionId: session.id,
      }, { timeout: 5000 });
      discordInfo = vcResponse.data;
      session.discordVC = discordInfo; // Store VC info in session
      console.log(`✅ Created Discord VC for session ${session.id}: ${discordInfo.inviteLink}`);
    } catch (error) {
      console.warn(`⚠️ Discord VC creation failed for session ${session.id}:`, error.message);
      // Continue without Discord VC
    }

    // Broadcast session creation to all lobby WebSocket clients
    broadcastToLobby({
      type: 'session_created',
      session: {
        id: session.id,
        gameMode: session.gameMode,
        status: session.status,
        playerCount: 0,
        discordLink: discordInfo?.inviteLink || null,
      },
    });

    res.json({
      sessionId: session.id,
      status: session.status,
      gameMode: session.gameMode,
      modeInfo: gameModes.getModeInfo(gameMode),
      discordVC: discordInfo,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * Get session details
 */
app.get('/sessions/:sessionId', (req, res) => {
  const session = sessionManager.getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId: session.id,
    status: session.status,
    playerCount: Object.keys(session.players).length,
    stats: sessionManager.getSessionStats(session.id),
  });
});

/**
 * Start session
 */
app.post('/sessions/:sessionId/start', express.json(), (req, res) => {
  const result = sessionManager.startSession(req.params.sessionId);
  
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

/**
 * End session
 */
app.post('/sessions/:sessionId/end', express.json(), (req, res) => {
  const result = sessionManager.endSession(req.params.sessionId);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Failed to end session' });
  }

  res.json(result);
});

/**
 * Advance turn (server-initiated)
 */
app.post('/sessions/:sessionId/advance-turn', express.json(), (req, res) => {
  const result = sessionManager.advanceTurnInSession(req.params.sessionId);
  
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

// ============= WEBSOCKET HANDLERS =============

// Store lobby connections
const lobbyConnections = new Set();

wss.on('connection', async (socket, req) => {
  console.log('🔗 New WebSocket connection');
  
  // Check if this is a lobby connection (no auth required)
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.searchParams.get('type') === 'lobby') {
    console.log('📺 Lobby viewer connected');
    socket.isLobby = true;
    lobbyConnections.add(socket);
    
    // Send current sessions
    const sessions = sessionManager.getActiveSessions();
    socket.send(JSON.stringify({
      type: 'sessions_list',
      sessions: sessions.map(s => ({
        id: s.id,
        gameMode: s.gameMode,
        status: s.status,
        playerCount: Object.keys(s.players || {}).length,
        discordLink: s.discordVC?.inviteLink || null,
      })),
    }));
    
    socket.on('close', () => {
      lobbyConnections.delete(socket);
      console.log('📺 Lobby viewer disconnected');
    });
    
    socket.on('error', () => {
      lobbyConnections.delete(socket);
    });
    
    return;
  }

  // Extract authorization header for game connections
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No auth header, closing connection');
    socket.close(4001, 'Unauthorized');
    return;
  }

  const idToken = authHeader.substring(7); // Remove "Bearer " prefix

  // Verify Firebase token
  const user = await verifyToken(idToken);
  if (!user || !user.uid) {
    console.log('❌ Invalid token, closing connection');
    socket.close(4001, 'Invalid token');
    return;
  }

  console.log(`✅ Authenticated user: ${user.uid}`);

  // Attach handlers
  socketHandler.attachSocketHandlers(socket, user.uid);
});

// Function to broadcast to all lobby viewers
function broadcastToLobby(message) {
  const payload = JSON.stringify(message);
  lobbyConnections.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

// ============= HEARTBEAT =============

// Periodic heartbeat to detect dead connections
setInterval(() => {
  socketHandler.heartbeatCheck(wss);
}, LIMITS.HEARTBEAT_INTERVAL_MS);

// Periodic session cleanup
setInterval(() => {
  sessionManager.periodicSessionCleanup();
}, LIMITS.SESSION_CLEANUP_INTERVAL_MS);

// ============= GRACEFUL SHUTDOWN =============

function gracefulShutdown(signal) {
  console.log(`\n📛 ${signal} received. Shutting down gracefully...`);

  // Close all sessions
  sessionManager.getActiveSessions().forEach((session) => {
    sessionManager.endSession(session.id);
  });

  // Close WebSocket connections
  wss.clients.forEach((socket) => {
    try {
      socket.close(1000, 'Server shutting down');
    } catch (e) {
    }
  });

  // Close HTTP server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('🔥 Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============= START SERVER =============

server.listen(PORT, () => {
  console.log(`\n🎮 ===== RIVALIS LIVE ENGINE =====`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Max concurrent players: ${LIMITS.MAX_CONCURRENT_PLAYERS}`);
  console.log(`🎴 Turn time: ${LIMITS.TURN_TIME_MS}ms`);
  console.log(`🔗 Discord Bot URL: ${DISCORD_BOT_URL}`);
  console.log(`====================================\n`);
});

// Unhandled exception handler
process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});
