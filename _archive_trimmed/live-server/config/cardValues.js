/**
 * Card Values & Effects Configuration
 * Defines how cards influence rep multipliers and game mechanics
 */

/**
 * Card types and their rep multiplier effects
 * Each card type has:
 *   - name: Display name
 *   - repMultiplier: How many more reps the card is worth (e.g., 2 = double reps)
 *   - duration: How long the effect lasts (in turns)
 *   - targetType: 'self' or 'opponent'
 *   - effect: What the card does
 */
const CARD_EFFECTS = {
  DOUBLE_REPS: {
    id: 'DOUBLE_REPS',
    name: 'Double Power',
    repMultiplier: 2.0,
    duration: 1, // Effect lasts 1 turn
    targetType: 'self',
    effect: 'Your reps count for 2x value this turn',
    basePoints: 20,
  },
  
  FREEZE_OPPONENT: {
    id: 'FREEZE_OPPONENT',
    name: 'Ice Block',
    repMultiplier: 0,  // No rep value
    duration: 1,
    targetType: 'opponent',
    effect: "Opponent's turn skipped (0 reps from them next turn)",
    basePoints: 25,
  },
  
  STEAL_REP: {
    id: 'STEAL_REP',
    name: 'Rep Thief',
    repMultiplier: 0,
    duration: 1,
    targetType: 'opponent',
    effect: 'Steal 30% of opponent reps from last turn',
    basePoints: 15,
    stealPercentage: 0.3,
  },
  
  REVERSE_ORDER: {
    id: 'REVERSE_ORDER',
    name: 'Turn Reversal',
    repMultiplier: 0,
    duration: 1,
    targetType: 'self',
    effect: 'Next player turn is skipped, you go again',
    basePoints: 30,
  },
  
  FORM_PENALTY: {
    id: 'FORM_PENALTY',
    name: 'Form Break',
    repMultiplier: 0,
    duration: 1,
    targetType: 'opponent',
    effect: 'Opponent form requirement increased by 25% next turn',
    basePoints: 20,
    formPenalty: 0.25,
  },
};

/**
 * Card rarity tiers (affects drop rate and display)
 */
const CARD_RARITIES = {
  COMMON: {
    id: 'COMMON',
    name: 'Common',
    color: 'grey',
    dropRate: 0.50,    // 50% of cards
    pointMultiplier: 1.0,
  },
  UNCOMMON: {
    id: 'UNCOMMON',
    name: 'Uncommon',
    color: 'green',
    dropRate: 0.35,    // 35% of cards
    pointMultiplier: 1.2,
  },
  RARE: {
    id: 'RARE',
    name: 'Rare',
    color: 'blue',
    dropRate: 0.12,    // 12% of cards
    pointMultiplier: 1.5,
  },
  EPIC: {
    id: 'EPIC',
    name: 'Epic',
    color: 'purple',
    dropRate: 0.02,    // 2% of cards
    pointMultiplier: 2.0,
  },
  LEGENDARY: {
    id: 'LEGENDARY',
    name: 'Legendary',
    color: 'gold',
    dropRate: 0.01,    // 1% of cards
    pointMultiplier: 3.0,
  },
};

/**
 * Card deck composition (50 cards total)
 * Specifies how many cards of each type are in the deck
 */
const DECK_COMPOSITION = {
  DOUBLE_REPS: {
    count: 10,
    rarityDistribution: {
      COMMON: 5,
      UNCOMMON: 3,
      RARE: 1,
      EPIC: 1,
    },
  },
  FREEZE_OPPONENT: {
    count: 10,
    rarityDistribution: {
      COMMON: 4,
      UNCOMMON: 4,
      RARE: 2,
    },
  },
  STEAL_REP: {
    count: 10,
    rarityDistribution: {
      COMMON: 3,
      UNCOMMON: 4,
      RARE: 2,
      EPIC: 1,
    },
  },
  REVERSE_ORDER: {
    count: 10,
    rarityDistribution: {
      COMMON: 3,
      UNCOMMON: 4,
      RARE: 2,
      EPIC: 1,
    },
  },
  FORM_PENALTY: {
    count: 10,
    rarityDistribution: {
      COMMON: 5,
      UNCOMMON: 3,
      RARE: 1,
      EPIC: 1,
    },
  },
};

/**
 * Active card effects (track which cards are currently active)
 * Format: { cardId, targetPlayerId, expiresAtTurn, effect }
 */
const createActiveCard = (cardId, targetPlayerId, currentTurn) => {
  const card = CARD_EFFECTS[cardId];
  if (!card) return null;

  return {
    cardId,
    cardName: card.name,
    targetPlayerId,
    appliedAtTurn: currentTurn,
    expiresAtTurn: currentTurn + card.duration,
    effect: card.effect,
    repMultiplier: card.repMultiplier,
    targetType: card.targetType,
  };
};

/**
 * Get applicable rep multiplier for current turn
 * Checks if any DOUBLE_REPS effects are active
 */
function getRepMultiplier(playerId, activeCards, currentTurn) {
  if (!Array.isArray(activeCards)) {
    return 1.0;
  }

  let multiplier = 1.0;

  for (const card of activeCards) {
    if (
      card.cardId === 'DOUBLE_REPS' &&
      card.targetPlayerId === playerId &&
      card.expiresAtTurn > currentTurn
    ) {
      multiplier *= card.repMultiplier;
    }
  }

  return multiplier;
}

/**
 * Check if player is frozen (FREEZE_OPPONENT active)
 */
function isPlayerFrozen(playerId, activeCards, currentTurn) {
  if (!Array.isArray(activeCards)) {
    return false;
  }

  return activeCards.some(
    card =>
      card.cardId === 'FREEZE_OPPONENT' &&
      card.targetPlayerId === playerId &&
      card.expiresAtTurn > currentTurn
  );
}

/**
 * Get form penalty applied to player
 */
function getFormPenalty(playerId, activeCards, currentTurn) {
  if (!Array.isArray(activeCards)) {
    return 0;
  }

  let penalty = 0;

  for (const card of activeCards) {
    if (
      card.cardId === 'FORM_PENALTY' &&
      card.targetPlayerId === playerId &&
      card.expiresAtTurn > currentTurn
    ) {
      penalty += card.formPenalty || 0.25;
    }
  }

  return Math.min(penalty, 0.75); // Cap at 75% penalty
}

/**
 * Calculate points earned from a card
 */
function getCardPoints(cardId, rarity = 'COMMON') {
  const card = CARD_EFFECTS[cardId];
  const rareData = CARD_RARITIES[rarity];

  if (!card || !rareData) {
    return 10;
  }

  return Math.round(card.basePoints * rareData.pointMultiplier);
}

/**
 * Get card by ID
 */
function getCard(cardId) {
  return CARD_EFFECTS[cardId] || null;
}

/**
 * Get all card types
 */
function getAllCardTypes() {
  return Object.keys(CARD_EFFECTS);
}

/**
 * Get deck composition summary
 */
function getDeckComposition() {
  return DECK_COMPOSITION;
}

/**
 * Validate card is active and not expired
 */
function isCardActive(card, currentTurn) {
  return card && card.expiresAtTurn > currentTurn;
}

/**
 * Clean up expired cards
 */
function cleanupExpiredCards(activeCards, currentTurn) {
  if (!Array.isArray(activeCards)) {
    return [];
  }

  return activeCards.filter(card => card.expiresAtTurn > currentTurn);
}

module.exports = {
  CARD_EFFECTS,
  CARD_RARITIES,
  DECK_COMPOSITION,
  createActiveCard,
  getRepMultiplier,
  isPlayerFrozen,
  getFormPenalty,
  getCardPoints,
  getCard,
  getAllCardTypes,
  getDeckComposition,
  isCardActive,
  cleanupExpiredCards,
};
