/**
 * Bot Engine - AI players that join sessions when needed
 * Bots submit realistic reps and follow game rules
 * Prevents long matchmaking waits
 */

const { v4: uuidv4 } = require('uuid');
const LIMITS = require('../config/limits');

// Bot names pool
const BOT_NAMES = [
  'BotAlpha', 'BotBeta', 'BotGamma', 'BotDelta', 'BotEpsilon',
  'BotZeta', 'BotEta', 'BotTheta', 'BotIota', 'BotKappa',
  'Crusher', 'Powerhouse', 'Ironman', 'Titan', 'Phoenix',
  'Nexus', 'Cyborg', 'Sentinel', 'Specter', 'Vortex',
];

/**
 * Create a bot player
 * Returns player object that can interact with game like real players
 */
function createBotPlayer(index = 0) {
  const repEngine = require('./repEngine');
  const eliminationEngine = require('./eliminationEngine');
  const antiCheatEngine = require('./antiCheat');

  return {
    id: `bot_${uuidv4().substring(0, 8)}`,
    name: BOT_NAMES[index % BOT_NAMES.length],
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
  };
}

/**
 * Generate realistic rep data for a bot
 * Returns rep object that passes validation
 */
function generateBotRep(botConfig) {
  // Base values close to real human performance
  const baseDepth = 0.75 + (Math.random() - 0.5) * botConfig.depthVariance;
  const baseForm = 0.80 + (Math.random() - 0.5) * botConfig.formVariance;

  // Randomize if this rep "succeeds" based on success rate
  const shouldSucceed = Math.random() < botConfig.successRate;

  // If fails, reduce depth/form below thresholds
  let depth = baseDepth;
  let formScore = baseForm;

  if (!shouldSucceed && Math.random() > 0.5) {
    // Random failure condition
    if (Math.random() > 0.5) {
      depth = 0.3 + Math.random() * 0.2; // Fail on depth
    } else {
      formScore = 0.2 + Math.random() * 0.2; // Fail on form
    }
  }

  // Clamp to valid ranges
  depth = Math.max(0, Math.min(1, depth));
  formScore = Math.max(0, Math.min(1, formScore));

  // Rep time varies between 800-3000ms
  const repTimeMs = 800 + Math.random() * 2200;

  return {
    depth,
    formScore,
    repTimeMs: Math.floor(repTimeMs),
    timestamp: Date.now(),
  };
}

/**
 * Check if session needs bots
 * Returns number of bots to add (0 if none needed)
 */
function calculateBotsNeeded(session, config) {
  const realPlayerCount = Object.keys(session.players).filter(
    id => !session.players[id].isBot
  ).length;

  const activeBotCount = Object.keys(session.players).filter(
    id => session.players[id].isBot
  ).length;

  // Add bots if:
  // 1. Session waiting too long (timeout)
  // 2. Not enough players for game

  if (session.status === 'waiting') {
    const waitTime = Date.now() - session.createdAt;

    // If waiting more than timeout and have some players, add bots
    if (waitTime > config.BOT_ADD_TIMEOUT_MS && realPlayerCount >= 1) {
      const needed = Math.min(
        config.MAX_PLAYERS - realPlayerCount - activeBotCount,
        config.BOT_ADD_COUNT
      );
      return Math.max(0, needed);
    }

    // If have minimum players, can start (no bots needed immediately)
    if (realPlayerCount >= LIMITS.MIN_PLAYERS) {
      return 0;
    }

    // If no players for a long time, add 1 bot to showcase
    if (waitTime > 60000 && realPlayerCount === 0) {
      return 1;
    }
  }

  // During active game, maintain minimum bots
  if (session.status === 'active') {
    const totalPlayers = Object.keys(session.players).length;
    if (totalPlayers < config.BOT_MIN_ACTIVE) {
      return Math.min(1, LIMITS.MAX_PLAYERS - totalPlayers);
    }
  }

  return 0;
}

/**
 * Add bots to a session
 * Returns array of added bot player IDs
 */
function addBotsToSession(session, count) {
  const addedBots = [];

  for (let i = 0; i < count; i++) {
    const bot = createBotPlayer(i);

    session.players[bot.id] = bot;
    session.playerOrder.push(bot.id);
    addedBots.push(bot.id);

    console.log(`🤖 Bot added to session: ${bot.name} (${bot.id})`);
  }

  return addedBots;
}

/**
 * Execute bot turn (submit rep)
 * Called when it's a bot's turn during active session
 */
function executeBotTurnAsync(bot, session, submitRepFunction) {
  return new Promise((resolve) => {
    // Simulate reaction time
    setTimeout(() => {
      try {
        // Generate realistic rep
        const repPayload = generateBotRep(bot.botConfig);

        // Submit through normal validation pipeline
        const result = submitRepFunction(session.id, bot.id, repPayload);

        if (result.valid) {
          console.log(`🤖 ${bot.name} submitted rep: +${result.repData.repsAdded} reps`);
        } else {
          console.log(`⚠️ ${bot.name} rep rejected: ${result.error}`);
        }

        resolve(result);
      } catch (error) {
        console.error(`🔥 Bot turn error for ${bot.name}:`, error.message);
        resolve({ valid: false, error: error.message });
      }
    }, bot.botConfig.reactionTimeMs);
  });
}

module.exports = {
  createBotPlayer,
  generateBotRep,
  calculateBotsNeeded,
  addBotsToSession,
  executeBotTurnAsync,
};
