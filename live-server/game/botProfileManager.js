/**
 * Bot Profile Manager
 * Handles creation, loading, and updating of bot profiles and stats in Firestore
 */

const admin = require('firebase-admin');
const db = admin.firestore();

const BOT_COLLECTION = 'bots';

// Create or load a bot profile by botId
async function getOrCreateBotProfile(botId, name, avatar) {
  const ref = db.collection(BOT_COLLECTION).doc(botId);
  const doc = await ref.get();
  if (doc.exists) return doc.data();

  // New bot profile
  const profile = {
    botId,
    name,
    avatar,
    stats: {
      totalReps: 0,
      totalScore: 0,
      bestScore: 0,
      sessionsPlayed: 0,
      gamesWon: 0,
      averageReps: 0,
      lastActive: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  };
  await ref.set(profile);
  return profile;
}

// Update bot stats after a game/session
async function updateBotStats(botId, statUpdates) {
  const ref = db.collection(BOT_COLLECTION).doc(botId);
  await ref.set({
    stats: {
      ...statUpdates,
      lastActive: new Date().toISOString(),
    }
  }, { merge: true });
}

// Get all bot profiles
async function getAllBotProfiles() {
  const snap = await db.collection(BOT_COLLECTION).get();
  return snap.docs.map(doc => doc.data());
}

module.exports = {
  getOrCreateBotProfile,
  updateBotStats,
  getAllBotProfiles,
};
