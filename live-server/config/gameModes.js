/**
 * Game Modes Configuration
 * Mirrors the 5 game modes from Hub Live Mode system
 * Defines all available game modes in Rivalis Live
 */

const GAME_MODES = {
  CLASSIC: {
    id: 'classic',
    name: 'Classic',
    description: 'Standard play - 2 jokers, 2 tricks. Pure skill showdown.',
    icon: '🃏',
    minPlayers: 2,
    maxPlayers: 6,
    jokerCount: 2,
    trickCount: 2,
    deckMultiplier: 1.0,
    turnTimeMs: 120000, // 2 minutes per turn
    allowSpectators: true,
    cardDeckEnabled: true,
    leaderboardType: 'score',
  },

  CHAOS: {
    id: 'chaos',
    name: 'Chaos Mode',
    description: 'Maximum chaos - 4 jokers, 6 tricks. Expect the unexpected!',
    icon: '🌪️',
    minPlayers: 2,
    maxPlayers: 6,
    jokerCount: 4,
    trickCount: 6,
    deckMultiplier: 1.0,
    turnTimeMs: 120000,
    allowSpectators: true,
    cardDeckEnabled: true,
    leaderboardType: 'score',
  },

  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Timed 20s rounds - 2 jokers, 3 tricks. Faster pace, no mercy!',
    icon: '⚡',
    minPlayers: 2,
    maxPlayers: 6,
    jokerCount: 2,
    trickCount: 3,
    deckMultiplier: 1.0,
    turnTimeMs: 20000, // 20 second rounds
    allowSpectators: true,
    cardDeckEnabled: true,
    leaderboardType: 'score',
  },

  ENDURANCE: {
    id: 'endurance',
    name: 'Endurance',
    description: '1.5x deck size, 3 jokers, 4 tricks. More reps, last one standing wins!',
    icon: '🏋️',
    minPlayers: 2,
    maxPlayers: 6,
    jokerCount: 3,
    trickCount: 4,
    deckMultiplier: 1.5,
    turnTimeMs: 120000,
    allowSpectators: true,
    cardDeckEnabled: true,
    leaderboardType: 'reps', // Focus on reps in endurance
  },

  PURE_GRIND: {
    id: 'pure_grind',
    name: 'Pure Grind',
    description: 'No tricks, no jokers - just raw reps. Pure skill!',
    icon: '💀',
    minPlayers: 2,
    maxPlayers: 6,
    jokerCount: 0,
    trickCount: 0,
    deckMultiplier: 1.0,
    turnTimeMs: 120000,
    allowSpectators: true,
    cardDeckEnabled: false, // No special cards
    leaderboardType: 'reps',
  },
};

/**
 * Get all available game modes
 */
function getAllModes() {
  return GAME_MODES;
}

/**
 * Get a specific game mode by ID
 */
function getMode(modeId) {
  return GAME_MODES[modeId.toUpperCase()];
}

/**
 * Check if a game mode exists
 */
function isValidMode(modeId) {
  return Object.keys(GAME_MODES).some(
    (key) => GAME_MODES[key].id === modeId
  );
}

/**
 * Get mode by name/id (case-insensitive)
 */
function getModeByIdOrName(identifier) {
  const normalized = identifier.toLowerCase();
  
  // Search by id
  for (const key in GAME_MODES) {
    if (GAME_MODES[key].id === normalized) {
      return GAME_MODES[key];
    }
  }
  
  // Search by name
  for (const key in GAME_MODES) {
    if (GAME_MODES[key].name.toLowerCase() === normalized) {
      return GAME_MODES[key];
    }
  }
  
  return null;
}

/**
 * Validate mode constraints (players, settings)
 */
function validateModeConstraints(modeId, playerCount = 2) {
  const mode = getModeByIdOrName(modeId);
  
  if (!mode) {
    return { valid: false, error: `Unknown game mode: ${modeId}` };
  }
  
  if (playerCount < mode.minPlayers) {
    return { 
      valid: false, 
      error: `${mode.name} requires at least ${mode.minPlayers} player(s)` 
    };
  }
  
  if (playerCount > mode.maxPlayers) {
    return { 
      valid: false, 
      error: `${mode.name} supports maximum ${mode.maxPlayers} player(s)` 
    };
  }
  
  return { valid: true, mode };
}

/**
 * Get default settings for a mode
 */
function getDefaultSettings(modeId) {
  const mode = getModeByIdOrName(modeId);
  
  if (!mode) {
    return null;
  }
  
  return {
    gameMode: mode.id,
    turnTimeMs: mode.turnTimeMs,
    cardDeckEnabled: mode.cardDeckEnabled,
    leaderboardType: mode.leaderboardType,
    jokerCount: mode.jokerCount,
    trickCount: mode.trickCount,
    deckMultiplier: mode.deckMultiplier,
  };
}

/**
 * Get mode info for display
 */
function getModeInfo(modeId) {
  const mode = getModeByIdOrName(modeId);
  
  if (!mode) {
    return null;
  }
  
  return {
    id: mode.id,
    name: mode.name,
    description: mode.description,
    icon: mode.icon,
    minPlayers: mode.minPlayers,
    maxPlayers: mode.maxPlayers,
    jokerCount: mode.jokerCount,
    trickCount: mode.trickCount,
  };
}

module.exports = {
  GAME_MODES,
  getAllModes,
  getMode,
  isValidMode,
  getModeByIdOrName,
  validateModeConstraints,
  getDefaultSettings,
  getModeInfo,
};
