const express = require('express');
const router = express.Router();
const botProfileManager = require('../game/botProfileManager');
const { getActiveSessions, createSession } = require('../game/sessionManager');
const { addBotsToSession } = require('../game/botEngine');

// List all bots and their stats
router.get('/api/bots', async (req, res) => {
  const bots = await botProfileManager.getAllBotProfiles();
  res.json(bots);
});

// Update a bot's stats
router.post('/api/bots/:botId', async (req, res) => {
  await botProfileManager.updateBotStats(req.params.botId, req.body.stats);
  res.json({ success: true });
});

// Force a bot to join a session
router.post('/api/bots/:botId/join', async (req, res) => {
  const sessions = getActiveSessions();
  if (sessions.length === 0) {
    // Create a new session if none exist
    const session = createSession({ gameMode: 'standard', exerciseName: 'pushups' });
    await addBotsToSession(session, 1);
    res.json({ success: true, message: 'Bot joined new session.' });
  } else {
    // Add bot to a random session
    const session = sessions[Math.floor(Math.random() * sessions.length)];
    await addBotsToSession(session, 1);
    res.json({ success: true, message: 'Bot joined existing session.' });
  }
});

// Force a bot to leave (not implemented, placeholder)
router.post('/api/bots/:botId/leave', async (req, res) => {
  // You would implement logic to remove a bot from a session here
  res.json({ success: true, message: 'Bot leave not yet implemented.' });
});

// Adjust bot behavior (difficulty, taunt frequency, etc.)
router.post('/api/bots/:botId/config', async (req, res) => {
  // Save config to bot profile (extend botProfileManager as needed)
  await botProfileManager.updateBotStats(req.params.botId, { config: req.body.config });
  res.json({ success: true });
});

module.exports = router;
