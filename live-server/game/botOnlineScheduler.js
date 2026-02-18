/**
 * Bot Online Scheduler
 * Maintains target online user count by spawning/removing bots based on time of day
 */

const { addBotsToSession } = require('../../_archive_trimmed/live-server/game/botEngine');
const { getActiveSessions } = require('./sessionManager');

// Target online user counts
const DAY_TARGET = 12; // 10-15 during day
const NIGHT_TARGET = 3; // 2-4 during 12-5am

function getCurrentTarget() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return NIGHT_TARGET;
  return DAY_TARGET;
}

// Main scheduler loop
async function maintainOnlineBots() {
  const target = getCurrentTarget();
  const sessions = getActiveSessions();
  let currentBots = 0;
  sessions.forEach(session => {
    currentBots += Object.values(session.players || {}).filter(p => p.isBot).length;
  });

  const needed = target - currentBots;
  if (needed > 0 && sessions.length > 0) {
    // Add bots to random sessions
    for (let i = 0; i < needed; i++) {
      const session = sessions[Math.floor(Math.random() * sessions.length)];
      await addBotsToSession(session, 1);
    }
    console.log(`🟢 Added ${needed} bots to maintain online count.`);
  } else if (needed < 0) {
    // Optionally: remove bots if too many (not implemented here)
    console.log(`🔵 Too many bots online, consider removing some.`);
  } else {
    console.log(`🟡 Bot online count is optimal.`);
  }
}

// Run every 5 minutes
setInterval(maintainOnlineBots, 5 * 60 * 1000);

module.exports = { maintainOnlineBots };
