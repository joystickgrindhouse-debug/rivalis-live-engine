/**
 * Rivalis Live - Session Hosting Server (Minimal)
 * Only handles session lifecycle - Hub owns game logic
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const axios = require('axios');
const sessionManager = require('./game/sessionManager');
const liveRoomsRouter = require('./api/liveRooms.routes');
const botAdminRouter = require('./api/bots');

// Discord Bot configuration
const DISCORD_BOT_URL = process.env.DISCORD_BOT_URL || 'http://localhost:5000';

// Initialize Express app
const app = express();
const server = http.createServer(app);
// Attach WebSocket for live chat/taunt
const { attachWebSocket } = require('./sockets/liveChat');
attachWebSocket(server);

const PORT = 8080; // Forced to 8080

// ============= MIDDLEWARE =============

app.use(express.json());
app.use(liveRoomsRouter);
app.use(botAdminRouter); // Admin bot management endpoints

// ============= HEALTH & INFO ENDPOINTS =============

// Root API overview
app.get('/', (req, res) => {
  res.json({
    name: 'Rivalis Live Engine - Session Hosting',
    version: '2.0.0',
    status: 'online',
    role: 'Backend utility service for session management',
    note: 'Game logic, rep validation, and scoring handled by Hub',
    endpoints: {
      health: 'GET /health',
      createSession: 'POST /sessions',
      getSession: 'GET /sessions/:sessionId',
      startSession: 'POST /sessions/:sessionId/start',
      endSession: 'POST /sessions/:sessionId/end',
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = {
    status: 'healthy',
    uptime: process.uptime(),
    activeSessions: sessionManager.getActiveSessions().length,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    timestamp: new Date().toISOString(),
  };
  
  res.json(stats);
});

// ============= SESSION ENDPOINTS =============

/**
 * Create new session
 * POST /sessions
 * Body: { gameMode?, exerciseName?, hubSessionId? }
 */
app.post('/sessions', async (req, res) => {
  try {
    const { gameMode = 'standard', exerciseName, hubSessionId } = req.body;

    const session = sessionManager.createSession({ 
      gameMode, 
      exerciseName,
      hubSessionId, // Optional: Link to Hub's session ID
    });

    // Create Discord voice channel
    let discordInfo = null;
    try {
      const vcResponse = await axios.post(`${DISCORD_BOT_URL}/create-vc`, {
        sessionId: session.id,
      }, { timeout: 5000 });
      discordInfo = vcResponse.data;
      session.discordVC = discordInfo;
      console.log(`✅ Created Discord VC for session ${session.id}: ${discordInfo.inviteLink}`);
    } catch (error) {
      console.warn(`⚠️ Discord VC creation failed for session ${session.id}:`, error.message);
    }

    res.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      gameMode: session.gameMode,
      discordVC: discordInfo,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * Get session details
 * GET /sessions/:sessionId
 */
app.get('/sessions/:sessionId', (req, res) => {
  const session = sessionManager.getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId: session.id,
    status: session.status,
    gameMode: session.gameMode,
    exerciseName: session.exerciseName,
    discordVC: session.discordVC || null,
    createdAt: session.createdAt,
    startedAt: session.startedAt || null,
    endedAt: session.endedAt || null,
  });
});

/**
 * Start session
 * POST /sessions/:sessionId/start
 */
app.post('/sessions/:sessionId/start', (req, res) => {
  const session = sessionManager.getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'waiting') {
    return res.status(400).json({ error: `Cannot start session with status: ${session.status}` });
  }

  session.status = 'active';
  session.startedAt = new Date().toISOString();

  console.log(`🎮 Session ${session.id} started`);

  res.json({
    success: true,
    sessionId: session.id,
    status: session.status,
    startedAt: session.startedAt,
  });
});

/**
 * End session
 * POST /sessions/:sessionId/end
 * Body: { reason?, winner?, stats? }
 */
app.post('/sessions/:sessionId/end', async (req, res) => {
  const session = sessionManager.getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'ended';
  session.endedAt = new Date().toISOString();
  session.endReason = req.body.reason || 'completed';
  session.winner = req.body.winner || null;
  session.stats = req.body.stats || null;

  console.log(`🏁 Session ${session.id} ended. Reason: ${session.endReason}`);

  // Delete Discord VC
  if (session.discordVC?.channelId) {
    try {
      await axios.post(`${DISCORD_BOT_URL}/delete-vc`, {
        sessionId: session.id,
      }, { timeout: 5000 });
      console.log(`✅ Deleted Discord VC for session ${session.id}`);
    } catch (error) {
      console.warn(`⚠️ Discord VC deletion failed for session ${session.id}:`, error.message);
    }
  }

  // Schedule cleanup (remove from memory after 5 minutes)
  setTimeout(() => {
    sessionManager.removeSession(session.id);
    console.log(`🗑️ Cleaned up session ${session.id} from memory`);
  }, 5 * 60 * 1000);

  res.json({
    success: true,
    sessionId: session.id,
    status: session.status,
    endedAt: session.endedAt,
    endReason: session.endReason,
  });
});

/**
 * Get all active sessions
 * GET /sessions
 */
app.get('/sessions', (req, res) => {
  const sessions = sessionManager.getActiveSessions().map(s => ({
    sessionId: s.id,
    status: s.status,
    gameMode: s.gameMode,
    exerciseName: s.exerciseName,
    discordLink: s.discordVC?.inviteLink || null,
    createdAt: s.createdAt,
  }));

  res.json({
    sessions,
    count: sessions.length,
  });
});

// ============= CLEANUP =============

// Periodic session cleanup (ended sessions older than 30 mins)
setInterval(() => {
  const sessions = sessionManager.getActiveSessions();
  const now = Date.now();
  
  sessions.forEach(session => {
    if (session.status === 'ended' && session.endedAt) {
      const endTime = new Date(session.endedAt).getTime();
      if (now - endTime > 30 * 60 * 1000) {
        sessionManager.removeSession(session.id);
        console.log(`🗑️ Auto-cleanup: Removed session ${session.id}`);
      }
    }
  });
}, 10 * 60 * 1000); // Check every 10 minutes

// ============= GRACEFUL SHUTDOWN =============

function gracefulShutdown(signal) {
  console.log(`\n📛 ${signal} received. Shutting down gracefully...`);

  // Delete all Discord VCs
  const sessions = sessionManager.getActiveSessions();
  const vcDeletions = sessions
    .filter(s => s.discordVC?.channelId)
    .map(s => 
      axios.post(`${DISCORD_BOT_URL}/delete-vc`, { sessionId: s.id }, { timeout: 3000 })
        .catch(err => console.warn(`Failed to delete VC for ${s.id}`))
    );

  Promise.all(vcDeletions).finally(() => {
    // Close HTTP server
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force shutdown after 5 seconds
    setTimeout(() => {
      console.error('🔥 Forced shutdown');
      process.exit(1);
    }, 5000);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============= START SERVER =============

server.listen(PORT, () => {
  console.log(`\n🎮 ===== RIVALIS LIVE - SESSION HOST =====`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Discord Bot URL: ${DISCORD_BOT_URL}`);
  console.log(`📝 Role: Session lifecycle management`);
  console.log(`⚠️  Game logic handled by Hub`);
  console.log(`=========================================\n`);
});

// Unhandled exception handler
process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});
