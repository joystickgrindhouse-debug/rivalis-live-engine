/**
 * Deck Engine - Fisher-Yates shuffle, memory-efficient card management
 * Integrates card effects and multipliers from cardValues config
 */

const LIMITS = require('../config/limits');
const cardValues = require('../config/cardValues');

// Card types from cardValues
const CARD_TYPES = cardValues.getAllCardTypes();

/**
 * Create a new deck for a session with card composition and rarity
 * Uses cardValues.DECK_COMPOSITION for proper distribution
 * Fisher-Yates shuffle built-in
 */
function createDeck() {
  const deck = [];
  const composition = cardValues.getDeckComposition();

  // Build deck from composition
  for (const cardType in composition) {
    const cardConfig = composition[cardType];
    const cardData = cardValues.getCard(cardType);
    
    if (!cardData) continue;

    // Create cards with rarity distribution
    const rarityDist = cardConfig.rarityDistribution || {};
    let cardIndex = 0;

    for (const rarity in rarityDist) {
      const count = rarityDist[rarity];
      for (let j = 0; j < count; j++) {
        deck.push({
          id: `${cardType}_${rarity}_${cardIndex}`,
          type: cardType,
          name: cardData.name,
          rarity: rarity,
          repMultiplier: cardData.repMultiplier,
          effect: cardData.effect,
          points: cardValues.getCardPoints(cardType, rarity),
          targetType: cardData.targetType,
          duration: cardData.duration,
        });
        cardIndex++;
      }
    }
  }

  // Fisher-Yates shuffle in-place
  shuffleDeck(deck);

  return {
    draw: deck,
    discard: [],
  };
}

/**
 * Fisher-Yates shuffle (in-place, memory efficient)
 */
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

/**
 * Draw next card from deck
 * Handles reshuffle if deck empty
 */
function drawCard(deckState) {
  // Reshuffle from discard if draw empty
  if (deckState.draw.length === 0) {
    if (deckState.discard.length === 0) {
      return null; // No cards available
    }
    
    // Move discard back to draw and shuffle
    deckState.draw = deckState.discard;
    deckState.discard = [];
    shuffleDeck(deckState.draw);
  }

  // Pop from end (O(1) operation)
  return deckState.draw.pop();
}

/**
 * Discard a card (for tracking)
 */
function discardCard(deckState, card) {
  if (!card) return;
  
  // Keep discard pile size limited
  deckState.discard.push(card);
  if (deckState.discard.length > LIMITS.DISCARD_PILE_MAX) {
    deckState.discard = deckState.discard.slice(-LIMITS.DISCARD_PILE_MAX);
  }
}

/**
 * Get deck statistics (for debugging)
 */
function getDeckStats(deckState) {
  return {
    cardsInDraw: deckState.draw.length,
    cardsInDiscard: deckState.discard.length,
  };
}

module.exports = {
  createDeck,
  drawCard,
  discardCard,
  getDeckStats,
  CARD_TYPES,
  getCardInfo: cardValues.getCard,
  getCardValues: () => cardValues.CARD_EFFECTS,
};
