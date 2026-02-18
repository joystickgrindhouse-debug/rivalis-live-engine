/**
 * Bot Game Runner
 * Ensures 1-2 games are always running with bots, and bots taunt players during games
 */

const { getActiveSessions, createSession } = require('./sessionManager');
const { addBotsToSession } = require('../../_archive_trimmed/live-server/game/botEngine');
const botTauntEngine = require('./botTauntEngine');

// Ensures 1-2 games are always running
async function ensureGamesRunning() {
  let sessions = getActiveSessions();
  if (sessions.length < 1) {
    // Create a new session with bots
    const session = createSession({ gameMode: 'standard', exerciseName: 'pushups' });
    await addBotsToSession(session, 3); // Start with 3 bots
    sessions = getActiveSessions();
    console.log('🟢 Started new bot game session.');
  }
  if (sessions.length < 2) {
    // Create a second session if needed
    const session = createSession({ gameMode: 'standard', exerciseName: 'squats' });
    await addBotsToSession(session, 3);
    console.log('🟢 Started second bot game session.');
  }
}

// Simulate bot taunts in a session
async function simulateBotTaunts(session) {
  const botPlayers = Object.values(session.players).filter(p => p.isBot);
  for (const bot of botPlayers) {
    // Randomly decide to taunt
    if (Math.random() < 0.5) {
      const taunt = botTauntEngine.getRandomTaunt();
      // Here, you would emit this taunt to the session chat (WebSocket or other)
      console.log(`💬 [${bot.name}]: ${taunt}`);
    }
  }
}

// Simulate bot replies to user messages
async function simulateBotReply(session, userMsg) {
  const botPlayers = Object.values(session.players).filter(p => p.isBot);
  for (const bot of botPlayers) {
    if (Math.random() < 0.7) {
      const reply = botTauntEngine.getSmartReply(userMsg);
      // Here, you would emit this reply to the session chat
      console.log(`💬 [${bot.name}]: ${reply}`);
    }
  }
}

// Run every 2 minutes to ensure games are running
setInterval(ensureGamesRunning, 2 * 60 * 1000);

module.exports = {
  ensureGamesRunning,
  simulateBotTaunts,
  simulateBotReply,
};
