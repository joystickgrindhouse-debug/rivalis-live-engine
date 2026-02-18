/**
 * Rivalis Live - Complete Discord Bot
 * Leaderboards, Stats, Hall of Fame, Raffle, Session VC Management
 */

require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType, EmbedBuilder } = require('discord.js');
const admin = require('firebase-admin');
const express = require('express');
const http = require('http');

// Initialize Express
const app = express();
app.use(express.json());

const httpServer = http.createServer(app);
const BOT_PORT = process.env.BOT_PORT || 5000;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Initialize Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  allowedMentions: { parse: [] },
  failIfNotExists: false,
});

// Store active voice channels
const activeChannels = new Map();

// ============= DISCORD EVENTS =============

client.once('clientReady', () => {
  console.log(`\n🎙️ ===== RIVALIS DISCORD BOT =====`);
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`🏢 Guild ID: ${DISCORD_GUILD_ID}`);
  console.log(`====================================\n`);

  client.user.setPresence({
    activities: [{ name: '!help for commands', type: 0 }],
    status: 'online',
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    if (command === 'leaderboard') {
      await handleLeaderboard(message);
    } else if (command === 'stats' || command === 'profile') {
      await handleStats(message, args);
    } else if (command === 'halloffame' || command === 'fame') {
      await handleHallOfFame(message);
    } else if (command === 'raffle') {
      await handleRaffle(message);
    } else if (command === 'help') {
      await handleHelp(message);
    }
  } catch (error) {
    console.error(`[Command Error] ${command}:`, error.message);
    message.reply({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch(() => {});
  }
});

client.on('error', (error) => {
  console.error('🔥 Discord Client Error:', error.message);
});

// ============= COMMAND HANDLERS =============

async function handleLeaderboard(message) {
  await message.defer?.() || message.react('⏳');

  const snapshot = await db.collection('leaderboards').doc('allTime').collection('users').orderBy('totalReps', 'desc').limit(10).get();

  if (snapshot.empty) {
    return message.reply('No leaderboard data yet.');
  }

  let leaderboardText = '';
  let position = 1;
  snapshot.forEach((doc) => {
    const data = doc.data();
    leaderboardText += `${position}. **${data.userId}** - ${data.totalReps} reps, ${data.totalScore} score\n`;
    position++;
  });

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('🏆 All-Time Leaderboard')
    .setDescription(leaderboardText)
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

async function handleStats(message, args) {
  await message.defer?.() || message.react('⏳');

  const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;

  const statsDoc = await db.collection('users').doc(userId).collection('stats').doc('overview').get();
  const raffleDoc = await db.collection('users').doc(userId).collection('gamification').doc('raffle').get();

  if (!statsDoc.exists) {
    return message.reply(`No stats found for user ${userId}.`);
  }

  const stats = statsDoc.data();
  const raffle = raffleDoc.exists ? raffleDoc.data() : { tickets: 0 };

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`📊 Stats for ${userId}`)
    .addFields(
      { name: 'Total Reps', value: `${stats.totalReps || 0}`, inline: true },
      { name: 'Total Score', value: `${stats.totalScore || 0}`, inline: true },
      { name: 'Best Score', value: `${stats.bestScore || 0}`, inline: true },
      { name: 'Sessions Played', value: `${stats.sessionsPlayed || 0}`, inline: true },
      { name: 'Average Reps/Session', value: `${stats.averageReps || 0}`, inline: true },
      { name: 'Games Won', value: `${stats.gamesWon || 0}`, inline: true },
      { name: '🎟️ Raffle Tickets', value: `${raffle.tickets}`, inline: false }
    )
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

async function handleHallOfFame(message) {
  await message.defer?.() || message.react('⏳');

  const snapshot = await db.collection('hallOfFame').orderBy('timestamp', 'desc').limit(5).get();

  if (snapshot.empty) {
    return message.reply('No winners yet.');
  }

  let fameText = '';
  snapshot.forEach((doc) => {
    const data = doc.data();
    const date = new Date(data.timestamp).toLocaleDateString();
    fameText += `🥇 **${data.winnerId}** won **${data.exercise}** with ${data.winnerScore} score (${date})\n`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🎖️ Hall of Fame')
    .setDescription(fameText)
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

async function handleRaffle(message) {
  await message.defer?.() || message.react('⏳');

  const snapshot = await db.collection('users').get();
  const users = [];

  for (const doc of snapshot.docs) {
    const raffleDoc = await db.collection('users').doc(doc.id).collection('gamification').doc('raffle').get();
    if (raffleDoc.exists) {
      users.push({
        userId: doc.id,
        tickets: raffleDoc.data().tickets || 0,
      });
    }
  }

  users.sort((a, b) => b.tickets - a.tickets);
  const topUsers = users.slice(0, 10);

  let raffleText = topUsers.length > 0 
    ? topUsers.map((user, idx) => `${idx + 1}. **${user.userId}** - ${user.tickets} 🎟️\n`).join('')
    : 'No raffle entries yet.';

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('🎰 Raffle Standings')
    .setDescription(raffleText)
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

async function handleHelp(message) {
  const embed = new EmbedBuilder()
    .setColor(0x9933ff)
    .setTitle('📖 Rivalis Bot Commands')
    .addFields(
      { name: '!leaderboard', value: 'View top 10 users by reps' },
      { name: '!stats [@user]', value: 'View your stats or mentioned user stats' },
      { name: '!halloffame', value: 'View recent winners' },
      { name: '!raffle', value: 'View raffle ticket standings' },
      { name: '!help', value: 'Show this message' }
    )
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

// ============= HTTP ENDPOINTS =============

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    botReady: client.isReady(),
    activeChannels: activeChannels.size,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
});

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

    const guild = await client.guilds.fetch(targetGuildId).catch(() => null);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const channel = await guild.channels.create({
      name: `rivalis-${sessionId.substring(0, 8)}`,
      type: ChannelType.GuildVoice,
      reason: `Rivalis Live session: ${sessionId}`,
    }).catch((e) => {
      throw new Error(`Failed to create channel: ${e.message}`);
    });

    const invite = await channel.createInvite({
      maxAge: 3600,
      maxUses: 100,
      temporary: true,
    }).catch(() => null);

    activeChannels.set(sessionId, {
      channelId: channel.id,
      guildId: guild.id,
      createdAt: Date.now(),
    });

    console.log(`✅ Created VC for session ${sessionId}`);

    res.json({
      channelId: channel.id,
      channelName: channel.name,
      guildId: guild.id,
      inviteLink: invite?.url || `https://discord.com/channels/${guild.id}/${channel.id}`,
    });
  } catch (error) {
    console.error('🔥 create-vc error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

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

    const channel = await client.channels.fetch(channelInfo.channelId).catch(() => null);
    if (channel) {
      await channel.delete('Session ended').catch(() => {});
    }

    activeChannels.delete(sessionId);
    console.log(`✅ Deleted VC for session ${sessionId}`);

    res.json({ success: true, channelId: channelInfo.channelId });
  } catch (error) {
    console.error('🔥 delete-vc error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/channels', (req, res) => {
  const channels = Array.from(activeChannels.entries()).map(([sessionId, info]) => ({
    sessionId,
    ...info,
  }));

  res.json({ activeChannels: channels, count: channels.length });
});

// ============= CLEANUP & SHUTDOWN =============

function gracefulShutdown(signal) {
  console.log(`\n📛 ${signal} received. Shutting down...`);

  activeChannels.forEach((info, sessionId) => {
    client.channels.fetch(info.channelId)
      .then((channel) => {
        if (channel) channel.delete('Bot shutting down').catch(() => {});
      })
      .catch(() => {});
  });

  activeChannels.clear();

  if (client.isReady()) {
    client.destroy();
  }

  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('🔥 Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

// ============= START =============

async function start() {
  try {
    await client.login(DISCORD_TOKEN);
    httpServer.listen(BOT_PORT, () => {
      console.log(`🌐 HTTP server on port ${BOT_PORT}\n`);
    });
  } catch (error) {
    console.error('🔥 Failed to start:', error);
    process.exit(1);
  }
}

start();
