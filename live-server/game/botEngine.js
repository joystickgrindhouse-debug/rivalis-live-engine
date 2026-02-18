/**
 * Bot Engine - AI players that join sessions when needed
 * Bots submit realistic reps and follow game rules
 * Prevents long matchmaking waits
 */

const { v4: uuidv4 } = require('uuid');
const LIMITS = require('../config/limits');
const botProfileManager = require('./botProfileManager');

// Realistic human names pool
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Sam', 'Chris', 
  'Jamie', 'Dakota', 'Drew', 'Blake', 'Kai', 'Avery', 'Cameron', 'Quinn',
  'Max', 'River', 'Sage', 'Phoenix', 'Rowan', 'Jules', 'Skylar', 'Devon',
  'Hunter', 'Logan', 'Mason', 'Parker', 'Reed', 'Rory', 'Spencer', 'Tanner',
  'Zion', 'Ari', 'Ash', 'Bay', 'Charlie', 'Eden', 'Finn', 'Gray',
  'Jade', 'Justice', 'Lane', 'Marley', 'Nova', 'Oakley', 'Payton', 'Reese'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark',
  'Lewis', 'Robinson', 'Walker', 'Young', 'Hall', 'Allen', 'King', 'Wright',
  'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell', 'Roberts',
  'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart'
];

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E2', '#F8B739', '#52B788', '#E63946', '#457B9D',
  '#FF8FAB', '#06FFA5', '#FFB627', '#A8DADC', '#E76F51', '#2A9D8F'
];

// Track used names to ensure uniqueness
const usedNames = new Set();

function generateUniqueName() {
  let attempts = 0;
  let name;
  do {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    name = `${firstName}_${lastName}${Math.floor(Math.random() * 99)}`;
    attempts++;
    if (attempts > 50) {
      name = `${firstName}_${lastName}${Date.now() % 1000}`;
      break;
    }
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

function generateAvatar(name) {
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  return { color, initials: name.split('_')[0][0] + name.split('_')[1][0] };
}

async function createBotPlayer(index = 0) {
  const repEngine = require('./repEngine');
  const eliminationEngine = require('./eliminationEngine');
  const antiCheatEngine = require('./antiCheat');

  const name = generateUniqueName();
  const avatar = generateAvatar(name);
  const botId = `bot_${uuidv4().substring(0, 8)}`;

  // Create or load persistent profile
  const profile = await botProfileManager.getOrCreateBotProfile(botId, name, avatar);

  return {
    id: botId,
    name,
    avatar,
    isBot: true,
    socket: null, // Bots don't have sockets
    repState: repEngine.createPlayerRepState(),
    eliminationState: eliminationEngine.createPlayerElimination(),
    antiCheatState: antiCheatEngine.createPlayerAntiCheat(),
    connectedAt: Date.now(),
    botConfig: {
      reactionTimeMs: 3000 + Math.random() * 4000, // 3-7s
      successRate: 0.7 + Math.random() * 0.25, // 70-95% success
      formVariance: 0.1,
      depthVariance: 0.15,
    },
    profile, // Attach persistent profile
  };
}

function generateBotRep(botConfig) {
  // Base values close to real human performance
  return {
    reps: Math.floor(10 + Math.random() * 10),
    formScore: botConfig.successRate * 100,
    depthScore: 80 + botConfig.depthVariance * 20,
    reactionTime: botConfig.reactionTimeMs,
    timestamp: Date.now(),
  };
}

function calculateBotsNeeded(session) {
  // Example: always keep 2 bots in session
  const currentBots = session.players.filter(p => p.isBot).length;
  return Math.max(0, 2 - currentBots);
}

function addBotsToSession(session) {
  const needed = calculateBotsNeeded(session);
  for (let i = 0; i < needed; i++) {
    session.players.push(createBotPlayer(i));
  }
}

function executeBotTurnAsync(bot, session) {
  // Simulate bot turn
  setTimeout(() => {
    const rep = generateBotRep(bot.botConfig);
    session.submitRep(bot.id, rep);
  }, bot.botConfig.reactionTimeMs);
}

module.exports = {
  createBotPlayer,
  generateBotRep,
  calculateBotsNeeded,
  addBotsToSession,
  executeBotTurnAsync,
};
