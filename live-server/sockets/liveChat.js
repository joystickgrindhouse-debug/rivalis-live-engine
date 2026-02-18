// WebSocket server for live chat and taunt interaction
const { Server } = require('ws');
const sessionManager = require('../game/sessionManager');
const botTauntEngine = require('../game/botTauntEngine');

const wss = new Server({ noServer: true });

// Map sessionId -> Set of sockets
const sessionSockets = new Map();

wss.on('connection', (ws, req, sessionId) => {
  const session = sessionManager.getSession(sessionId);
  // Only allow chat if session is in 'waiting' (lobby) state
  if (!session || session.status !== 'waiting') {
    ws.close(4000, 'Chat only available in lobby');
    return;
  }
  if (!sessionSockets.has(sessionId)) sessionSockets.set(sessionId, new Set());
  sessionSockets.get(sessionId).add(ws);

  ws.on('message', (msg) => {
    let parsed;
    try { parsed = JSON.parse(msg); } catch { return; }
    // Re-check session status before broadcasting
    const session = sessionManager.getSession(sessionId);
    if (!session || session.status !== 'waiting') return;
    // Broadcast to all in session
    for (const client of sessionSockets.get(sessionId)) {
      if (client.readyState === ws.OPEN) client.send(msg);
    }
    // If user message, let bots reply
    if (parsed.type === 'chat' && parsed.user && !parsed.isBot) {
      const botPlayers = Object.values(session.players || {}).filter(p => p.isBot);
      for (const bot of botPlayers) {
        if (Math.random() < 0.7) {
          const reply = botTauntEngine.getSmartReply(parsed.text);
          setTimeout(() => {
            // Re-check session status before bot replies
            const session = sessionManager.getSession(sessionId);
            if (!session || session.status !== 'waiting') return;
            const botMsg = JSON.stringify({ type: 'chat', user: bot.name, isBot: true, text: reply });
            for (const client of sessionSockets.get(sessionId)) {
              if (client.readyState === ws.OPEN) client.send(botMsg);
            }
          }, 1000 + Math.random() * 2000);
        }
      }
    }
  });

  ws.on('close', () => {
    sessionSockets.get(sessionId).delete(ws);
    if (sessionSockets.get(sessionId).size === 0) sessionSockets.delete(sessionId);
  });
});

// Upgrade HTTP server to handle WebSocket
function attachWebSocket(server) {
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, sessionId);
    });
  });
}

module.exports = { attachWebSocket };
