/**
 * Rivalis Live - Discord Voice Bot
 * Lightweight configuration for Android Termux
 * Minimal intents, disabled caching, focused on voice channel management
 */

require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const express = require('express');
const http = require('http');

// Initialize Express
const app = express();
app.use(express.json());

const httpServer = http.createServer(app);
const BOT_PORT = process.env.BOT_PORT || 5000;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

// Initialize Discord Client with minimal resources
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  // Disable all caching to reduce memory
  allowedMentions: { parse: [] },
  failIfNotExists: false,
});

// Store active voice channels (session -> channel mapping)
const activeChannels = new Map();

// ============= DISCORD EVENTS =============

client.once('ready', () => {
  console.log(`\n🎙️ ===== RIVALIS DISCORD BOT =====`);
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`🏢 Guild ID: ${DISCORD_GUILD_ID}`);
  console.log(`====================================\n`);

  // Set bot status
  client.user.setPresence({
    activities: [
      {
        name: 'Rivalis Live',
        type: 0, // PLAYING
      },
    ],
    status: 'online',
  });
});

client.on('error', (error) => {
  console.error('🔥 Discord Client Error:', error.message);
});

// ============= HTTP ENDPOINTS =============

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    botReady: client.isReady(),
    activeChannels: activeChannels.size,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
});

/**
 * Create voice channel for session
 * POST /create-vc
 * Body: { sessionId, guildId? }
 * Returns: { channelId, inviteLink }
 */
app.post('/create-vc', async (req, res) => {
  try {
    const { sessionId, guildId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    if (activeChannels.has(sessionId)) {
      return res.status(400).json({ error: 'Channel already exists for session' });
    }

    const targetGuildId = guildId || DISCORD_GUILD_ID;
    if (!targetGuildId) {
      return res.status(400).json({ error: 'No guild ID provided' });
    }

    // Fetch guild
    let guild;
    try {
      guild = await client.guilds.fetch(targetGuildId);
    } catch (error) {
      console.error('Failed to fetch guild:', error.message.substring(0, 50));
      return res.status(500).json({ error: 'Failed to access Discord guild' });
    }

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Create voice channel
    let channel;
    try {
      channel = await guild.channels.create({
        name: `Rivalis-${sessionId.substring(0, 8)}`,
        type: ChannelType.GuildVoice,
        reason: `Rivalis Live session: ${sessionId}`,
      });
    } catch (error) {
      console.error('Failed to create channel:', error.message.substring(0, 50));
      return res.status(500).json({ error: 'Failed to create voice channel' });
    }

    // Generate invite link
    let invite;
    try {
      invite = await channel.createInvite({
        maxAge: 3600, // 1 hour
        maxUses: 100,
        temporary: true,
        reason: `Rivalis Live session: ${sessionId}`,
      });
    } catch (error) {
      // If invite fails, just continue with channel link
      console.warn('Failed to create invite:', error.message.substring(0, 50));
      invite = null;
    }

    // Store channel reference
    activeChannels.set(sessionId, {
      channelId: channel.id,
      guildId: guild.id,
      createdAt: Date.now(),
    });

    console.log(`✅ Created voice channel for session ${sessionId}: ${channel.id}`);

    res.json({
      channelId: channel.id,
      channelName: channel.name,
      guildId: guild.id,
      inviteLink: invite ? invite.url : `https://discord.com/channels/${guild.id}/${channel.id}`,
    });
  } catch (error) {
    console.error('🔥 Error in create-vc:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete voice channel for session
 * POST /delete-vc
 * Body: { sessionId }
 * Returns: { success, channelId }
 */
app.post('/delete-vc', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const channelInfo = activeChannels.get(sessionId);
    if (!channelInfo) {
      return res.status(404).json({ error: 'No channel found for session' });
    }

    try {
      // Fetch channel and delete
      const channel = await client.channels.fetch(channelInfo.channelId);
      if (channel) {
        await channel.delete('Rivalis Live session ended');
        console.log(`✅ Deleted voice channel for session ${sessionId}: ${channelInfo.channelId}`);
      }
    } catch (error) {
      console.error('Failed to delete channel:', error.message.substring(0, 50));
      // Continue anyway, remove from map
    }

    // Remove from active channels
    activeChannels.delete(sessionId);

    res.json({
      success: true,
      channelId: channelInfo.channelId,
      message: 'Channel deleted successfully',
    });
  } catch (error) {
    console.error('🔥 Error in delete-vc:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get active channels
 * GET /channels
 */
app.get('/channels', (req, res) => {
  const channels = Array.from(activeChannels.entries()).map(([sessionId, info]) => ({
    sessionId,
    ...info,
  }));

  res.json({
    activeChannels: channels,
    count: channels.length,
  });
});

/**
 * Cleanup expired channels (every hour)
 */
function cleanupExpiredChannels() {
  const now = Date.now();
  const maxChannelAge = 3600000; // 1 hour

  for (const [sessionId, info] of activeChannels.entries()) {
    if (now - info.createdAt > maxChannelAge) {
      console.log(`🗑️ Cleaning up expired channel: ${sessionId}`);
      
      // Try to delete from Discord
      client.channels.fetch(info.channelId)
        .then((channel) => {
          if (channel) {
            channel.delete('Cleanup: Session expired');
          }
        })
        .catch((e) => {
          // Already deleted or doesn't exist
        });

      activeChannels.delete(sessionId);
    }
  }
}

// ============= GRACEFUL SHUTDOWN =============

function gracefulShutdown(signal) {
  console.log(`\n📛 ${signal} received. Shutting down gracefully...`);

  // Close all voice channels
  activeChannels.forEach((info, sessionId) => {
    client.channels.fetch(info.channelId)
      .then((channel) => {
        if (channel) {
          channel.delete('Bot shutting down');
        }
      })
      .catch(() => {});
  });

  activeChannels.clear();

  // Disconnect Discord client
  if (client.isReady()) {
    client.destroy();
  }

  // Close HTTP server
  httpServer.close(() => {
    console.log('✅ Bot server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('🔥 Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============= START BOT =============

// Cleanup task runs every 5 minutes
setInterval(cleanupExpiredChannels, 300000);

async function start() {
  try {
    // Connect Discord bot
    await client.login(DISCORD_TOKEN);

    // Wait for bot to be ready
    await client.on('ready', () => {});

    // Start HTTP server
    httpServer.listen(BOT_PORT, () => {
      console.log(`🌐 HTTP server listening on port ${BOT_PORT}\n`);
    });
  } catch (error) {
    console.error('🔥 Failed to start bot:', error);
    process.exit(1);
  }
}

start();

// Unhandled exception handler
process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});
