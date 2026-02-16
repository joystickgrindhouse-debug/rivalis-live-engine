/**
 * Rivalis Live - Complete Discord Bot
 * Leaderboards, Stats, Hall of Fame, Raffle, Session VC Management
 */

require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType, EmbedBuilder } = require('discord.js');
const admin = require('firebase-admin');
const express = require('express');
const http = require('http');
const sharp = require('sharp');

// Initialize Express
const app = express();
app.use(express.json());

const httpServer = http.createServer(app);
const BOT_PORT = process.env.BOT_PORT || 5000;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const WINNER_ROLE_NAME = process.env.WINNER_ROLE_NAME || 'Champion';

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

// Store active voice channels (session -> channel mapping)
const activeChannels = new Map();

// ============= XP & REWARDS SYSTEM =============
function calculateXP(repsAdded, scoreAdded) {
  // 1 XP per rep + 0.5 XP per score point
  return Math.floor(repsAdded + scoreAdded * 0.5);
}

function calculatePlacementBonus(placement) {
  // 1st: 100 XP, 2nd: 50 XP, 3rd: 25 XP, others: 10 XP
  const bonuses = { 1: 100, 2: 50, 3: 25 };
  return bonuses[placement] || 10;
}

function calculateRaffleTickets(placement, repsAdded) {
  // 1st place: 5 tickets, 2nd: 3 tickets, 3rd: 2 tickets, others: 1 ticket
  const baseTickets = { 1: 5, 2: 3, 3: 2 };
  const tickets = baseTickets[placement] || 1;
  // Bonus: 1 extra ticket per 10 reps
  return tickets + Math.floor(repsAdded / 10);
}

// ============= SOCIAL SHARING HELPERS =============

function generateShareText(username, placement, exercise, reps, score) {
  const placements = {
    1: '🥇 1st Place!',
    2: '🥈 2nd Place!',
    3: '🥉 3rd Place!',
  };

  return `I just crushed a Rivalis Live session! ${placements[placement] || `Finished in #${placement}!`}

💪 Exercise: ${exercise}
📊 Reps: ${reps}
🎯 Score: ${score}

Ready to compete? Join Rivalis Live! 🔗`;
}

function generateShareHashtags() {
  return '#RivalisLive #FitnessChallenge #WorkoutGoals #CompetitiveFitness #ExerciseGaming #FitnessTech';
}

// ============= SOCIAL SHARE ENDPOINTS =============

/**
 * Generate shareable match result
 * POST /share/generate
 * Body: { userId, username, placement, exercise, reps, score, sessionId }
 */
app.post('/share/generate', async (req, res) => {
  try {
    const { userId, username, placement, exercise, reps, score, sessionId } = req.body;

    if (!userId || !placement || !exercise) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const shareId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const shareText = generateShareText(username || 'A Rivalis Player', placement, exercise, reps || 0, score || 0);
    const hashtags = generateShareHashtags();

    // Save share to Firebase for analytics
    await db.collection('shares').doc(shareId).set({
      userId,
      username,
      placement,
      exercise,
      reps,
      score,
      sessionId,
      shareText,
      hashtags,
      createdAt: new Date().toISOString(),
      platform: 'pending',
    });

    // Generate share URLs for different platforms
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + '\n\n' + hashtags)}&url=https://rivalislife.vercel.app`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=https://rivalislife.vercel.app&quote=${encodeURIComponent(shareText)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=https://rivalislife.vercel.app`,
      reddit: `https://reddit.com/submit?url=https://rivalislife.vercel.app&title=${encodeURIComponent(shareText)}`,
    };

    // Generate preview image
    const imageUrl = generateImageUrl(username, placement, exercise, reps, score);

    res.json({
      success: true,
      shareId,
      shareText,
      hashtags,
      shareUrls,
      imageUrl,
      copyText: `${shareText}\n\n${hashtags}`,
      tiktokTemplate: `Caption: ${shareText}\nHashtags: ${hashtags}`,
      instagramTemplate: `Caption: ${shareText}\n\nHashtags:\n${hashtags.split(' ').join('\n')}`,
      embedImage: `<img src="${imageUrl}" alt="Rivalis Live Match Result" width="1200" height="630">`,
    });
  } catch (error) {
    console.error('🔥 Error in share/generate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= IMAGE GENERATION =============

function generateImageUrl(username, placement, exercise, reps, score) {
  // Using og-image.vercel.app for dynamic image generation
  // Format: https://og-image.vercel.app/[text]
  
  const placementEmoji = ['', '🥇', '🥈', '🥉'][placement] || '🏆';
  const text = `${placementEmoji} ${username} - ${exercise}`;
  const subtext = `${reps} reps | ${score} score`;
  
  // Create image URL using a service
  const imageParams = encodeURIComponent(`**${text}**\n${subtext}`);
  
  // Using og-image service (free tier available)
  return `https://og-image.vercel.app/${imageParams}.png?theme=dark&md=1&fontSize=100px`;
}

function generateSVGCard(username, placement, exercise, reps, score) {
  // Generate an SVG card for embedding
  const placementText = {
    1: { emoji: '🥇', text: '1ST PLACE', color: '#FFD700' },
    2: { emoji: '🥈', text: '2ND PLACE', color: '#C0C0C0' },
    3: { emoji: '🥉', text: '3RD PLACE', color: '#CD7F32' },
  }[placement] || { emoji: '🏆', text: `${placement}TH PLACE`, color: '#00FF00' };

  return `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="630" fill="#1a1a2e"/>
  
  <!-- Gradient overlay -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#16213e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#grad)"/>
  
  <!-- Top bar -->
  <rect width="1200" height="80" fill="${placementText.color}" opacity="0.2"/>
  
  <!-- Placement badge -->
  <circle cx="100" cy="100" r="50" fill="${placementText.color}"/>
  <text x="100" y="115" font-size="60" font-weight="bold" text-anchor="middle" fill="#000">${placementText.emoji}</text>
  
  <!-- Username -->
  <text x="200" y="80" font-size="48" font-weight="bold" fill="#FFFFFF">${username}</text>
  <text x="200" y="130" font-size="32" fill="#00FF00">${placementText.text}</text>
  
  <!-- Stats section -->
  <text x="150" y="250" font-size="36" font-weight="bold" fill="#FFFFFF">MATCH STATS</text>
  
  <!-- Exercise -->
  <rect x="150" y="300" width="350" height="120" fill="#16213e" rx="10"/>
  <text x="325" y="330" font-size="28" text-anchor="middle" fill="#00FF00">💪 EXERCISE</text>
  <text x="325" y="385" font-size="40" font-weight="bold" text-anchor="middle" fill="#FFFFFF">${exercise.toUpperCase()}</text>
  
  <!-- Reps -->
  <rect x="550" y="300" width="250" height="120" fill="#16213e" rx="10"/>
  <text x="675" y="330" font-size="28" text-anchor="middle" fill="#00FF00">📊 REPS</text>
  <text x="675" y="385" font-size="40" font-weight="bold" text-anchor="middle" fill="#FFFFFF">${reps}</text>
  
  <!-- Score -->
  <rect x="850" y="300" width="200" height="120" fill="#16213e" rx="10"/>
  <text x="950" y="330" font-size="28" text-anchor="middle" fill="#00FF00">🎯 SCORE</text>
  <text x="950" y="385" font-size="40" font-weight="bold" text-anchor="middle" fill="#FFFFFF">${score}</text>
  
  <!-- Divider -->
  <line x1="150" y1="470" x2="1050" y2="470" stroke="#00FF00" stroke-width="2" opacity="0.5"/>
  
  <!-- Footer -->
  <text x="600" y="550" font-size="32" font-weight="bold" text-anchor="middle" fill="#FFFFFF">RIVALIS LIVE</text>
  <text x="600" y="590" font-size="24" text-anchor="middle" fill="#00FF00">Competitive Fitness Gaming</text>
</svg>
  `.trim();
}

/**
 * Track social share
 * POST /share/track
 * Body: { shareId, platform, url }
 */
app.post('/share/track', async (req, res) => {
  try {
    const { shareId, platform, url } = req.body;

    if (!shareId || !platform) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get share info to find userId
    const shareDoc = await db.collection('shares').doc(shareId).get();
    if (!shareDoc.exists) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const shareData = shareDoc.data();
    const userId = shareData.userId;

    // Update share record
    await db.collection('shares').doc(shareId).update({
      platform,
      sharedUrl: url,
      sharedAt: new Date().toISOString(),
    });

    // Award 50 bonus raffle tickets for sharing
    const userStatsRef = db.collection('users').doc(userId).collection('stats').doc('overview');
    const userStatsDoc = await userStatsRef.get();
    const currentStats = userStatsDoc.exists ? userStatsDoc.data() : { totalRaffleTickets: 0 };

    await userStatsRef.set({
      ...currentStats,
      totalRaffleTickets: (currentStats.totalRaffleTickets || 0) + 50,
      lastShareBonusAt: new Date().toISOString(),
    }, { merge: true });

    // Log the bonus
    await db.collection('users').doc(userId).collection('bonuses').doc(shareId).set({
      type: 'social_share',
      platform,
      raffleTickets: 50,
      awardedAt: new Date().toISOString(),
    });

    // Increment platform stats
    const statsRef = db.collection('analytics').doc('shares');
    await statsRef.set({
      [platform]: admin.firestore.FieldValue.increment(1),
      total: admin.firestore.FieldValue.increment(1),
      totalTicketsAwarded: admin.firestore.FieldValue.increment(50),
      lastUpdated: new Date().toISOString(),
    }, { merge: true });

    res.json({ 
      success: true, 
      message: `Share tracked on ${platform}! 🎉 +50 raffle tickets awarded!`,
      bonusTickets: 50,
    });
  } catch (error) {
    console.error('🔥 Error in share/track:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get share statistics
 * GET /share/stats
 */
app.get('/share/stats', async (req, res) => {
  try {
    const statsDoc = await db.collection('analytics').doc('shares').get();
    const stats = statsDoc.data() || { twitter: 0, facebook: 0, linkedin: 0, reddit: 0, tiktok: 0, instagram: 0, total: 0 };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('🔥 Error in share/stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's share history
 * GET /share/history/:userId
 */
app.get('/share/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const sharesSnapshot = await db.collection('shares')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const shares = sharesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      shares,
      totalShares: shares.length,
    });
  } catch (error) {
    console.error('🔥 Error in share/history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= DISCORD EVENTS =============

client.once('ready', () => {
  console.log(`\n🎙️ ===== RIVALIS DISCORD BOT =====`);
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`🏢 Guild ID: ${DISCORD_GUILD_ID}`);
  console.log(`====================================\n`);

  client.user.setPresence({
    activities: [{ name: 'Rivalis Live', type: 0 }],
    status: 'online',
  });
});

client.on('error', (error) => {
  console.error('🔥 Discord Client Error:', error.message);
});

// ============= DISCORD MESSAGE COMMANDS =============

client.on('messageCreate', async (message) => {
  // Ignore bot messages and non-command messages
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(/\s+/);
  const command = args[0].toLowerCase();

  try {
    if (command === 'xp') {
      await handleXPCommand(message, args);
    } else if (command === 'xp-leaderboard') {
      await handleXPLeaderboardCommand(message);
    } else if (command === 'tickets-leaderboard') {
      await handleTicketsLeaderboardCommand(message);
    } else if (command === 'share') {
      await handleShareCommand(message, args);
    }
  } catch (error) {
    console.error(`Error in command ${command}:`, error);
    message.reply('❌ An error occurred executing this command.').catch(() => {});
  }
});

// ============= COMMAND HANDLERS =============

async function handleXPCommand(message, args) {
  const targetUser = message.mentions.users.first() || message.author;
  
  try {
    // Find userId from discordId
    const usersSnapshot = await db.collection('users')
      .where('discordId', '==', targetUser.id)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return message.reply('❌ User not found in database.').catch(() => {});
    }

    const userId = usersSnapshot.docs[0].id;
    const statsDoc = await db.collection('users').doc(userId).collection('stats').doc('overview').get();
    const stats = statsDoc.data() || { xp: 0, totalRaffleTickets: 0 };

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`⭐ ${targetUser.username}'s Stats`)
      .addFields(
        { name: '⭐ Total XP', value: `${stats.xp || 0}`, inline: true },
        { name: '🎟️ Raffle Tickets', value: `${stats.totalRaffleTickets || 0}`, inline: true },
        { name: '🏆 Sessions Played', value: `${stats.sessionsPlayed || 0}`, inline: true },
        { name: '🥇 Wins', value: `${stats.gamesWon || 0}`, inline: true },
        { name: '📊 Total Reps', value: `${stats.totalReps || 0}`, inline: true },
        { name: '🎯 Total Score', value: `${stats.totalScore || 0}`, inline: true }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleXPCommand:', error);
    message.reply('❌ Failed to fetch XP stats.').catch(() => {});
  }
}

async function handleXPLeaderboardCommand(message) {
  try {
    const usersSnapshot = await db.collection('users')
      .orderBy('xp', 'desc')
      .limit(10)
      .get();

    if (usersSnapshot.empty) {
      return message.reply('❌ No users found.').catch(() => {});
    }

    let leaderboardText = '```\n🏆 XP LEADERBOARD - TOP 10\n\n';
    let position = 1;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const xp = userData.xp || 0;
      const username = userData.username || `User ${doc.id.substring(0, 6)}`;
      const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`;
      
      leaderboardText += `${medal} ${username.padEnd(20)} - ${xp} XP\n`;
      position++;
    }

    leaderboardText += '```';

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('⭐ XP Leaderboard')
      .setDescription(leaderboardText)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleXPLeaderboardCommand:', error);
    message.reply('❌ Failed to fetch leaderboard.').catch(() => {});
  }
}

async function handleTicketsLeaderboardCommand(message) {
  try {
    const usersSnapshot = await db.collection('users')
      .orderBy('totalRaffleTickets', 'desc')
      .limit(10)
      .get();

    if (usersSnapshot.empty) {
      return message.reply('❌ No users found.').catch(() => {});
    }

    let leaderboardText = '```\n🎟️ RAFFLE TICKETS LEADERBOARD - TOP 10\n\n';
    let position = 1;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const tickets = userData.totalRaffleTickets || 0;
      const username = userData.username || `User ${doc.id.substring(0, 6)}`;
      const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`;
      
      leaderboardText += `${medal} ${username.padEnd(20)} - ${tickets} 🎟️\n`;
      position++;
    }

    leaderboardText += '```';

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎟️ Raffle Tickets Leaderboard')
      .setDescription(leaderboardText)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleTicketsLeaderboardCommand:', error);
    message.reply('❌ Failed to fetch leaderboard.').catch(() => {});
  }
}

async function handleShareCommand(message, args) {
  // Usage: !share [exercise] [reps] [score] [placement]
  // Example: !share squats 50 1000 1
  
  const subcommand = args[1]?.toLowerCase();

  if (subcommand === 'template') {
    // Show share template help
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📢 Social Share Templates')
      .setDescription('Share your match results to grow Rivalis!')
      .addFields(
        { name: '🐦 Twitter Template', value: '```\nI just crushed a Rivalis Live session!\n\n💪 Exercise: [exercise]\n📊 Reps: [reps]\n🎯 Score: [score]\n\n#RivalisLive #FitnessChallenge```', inline: false },
        { name: '📱 TikTok Template', value: '```\nCaption: Just got [placement]st place in Rivalis!\n\nHashtags: #RivalisLive #FitnessChallenge\n#WorkoutChallenge #CompetitiveFitness```', inline: false },
        { name: '📸 Instagram Template', value: '```\nI crushed my fitness goals today! \n\n💪 [exercise]\n📊 [reps] reps\n🎯 [score] points\n\n#RivalisLive\n#FitnessChallenge\n#WorkoutGoals```', inline: false }
      )
      .setFooter({ text: '!share <exercise> <reps> <score> <placement>' });

    return message.reply({ embeds: [embed] });
  }

  if (args.length < 5) {
    return message.reply('❌ Usage: `!share <exercise> <reps> <score> <placement>`\nExample: `!share squats 50 1000 1`\nOr: `!share template` for pre-made templates').catch(() => {});
  }

  try {
    const exercise = args[1];
    const reps = parseInt(args[2]);
    const score = parseInt(args[3]);
    const placement = parseInt(args[4]);

    const username = message.author.username;
    const userId = message.author.id;

    // Call share/generate endpoint
    const response = await fetch('http://localhost:5000/share/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        username,
        placement,
        exercise,
        reps,
        score,
        sessionId: 'discord-share',
      }),
    });

    const shareData = await response.json();

    if (!response.ok) {
      return message.reply('❌ Failed to generate share card.').catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(placement === 1 ? '#FFD700' : placement === 2 ? '#C0C0C0' : placement === 3 ? '#CD7F32' : '#00FF00')
      .setTitle('📢 Share Your Victory!')
      .addFields(
        { name: '🥇 Result', value: `${['', '🥇 1st Place!', '🥈 2nd Place!', '🥉 3rd Place!'][placement] || `#${placement}`}`, inline: false },
        { name: '💪 Exercise', value: exercise, inline: true },
        { name: '📊 Reps', value: `${reps}`, inline: true },
        { name: '🎯 Score', value: `${score}`, inline: true },
        { name: '📝 Message', value: `\`\`\`\n${shareData.shareText}\n\`\`\`` },
        { name: '\n🔗 Share Links', value: `[🐦 Twitter](${shareData.shareUrls.twitter}) | [📘 Facebook](${shareData.shareUrls.facebook}) | [💼 LinkedIn](${shareData.shareUrls.linkedin}) | [🔗 Reddit](${shareData.shareUrls.reddit})`, inline: false },
        { name: '🎉 Bonus', value: '✨ Share to earn **+50 raffle tickets** per platform!' }
      )
      .setFooter({ text: `Share ID: ${shareData.shareId}` });

    message.reply({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    console.error('Error in handleShareCommand:', error);
    message.reply('❌ Failed to generate share card.').catch(() => {});
  }
}

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
 * Award performance-based rewards
 * POST /award-performance
 * Body: { userId, discordId, placement, repsAdded, scoreAdded, sessionId }
 */
app.post('/award-performance', async (req, res) => {
  try {
    const { userId, discordId, placement, repsAdded, scoreAdded, sessionId } = req.body;

    if (!userId || !discordId || !placement) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
    if (!guild) {
      return res.status(500).json({ error: 'Guild not found' });
    }

    // Calculate rewards
    const xpAwarded = calculateXP(repsAdded || 0, scoreAdded || 0) + calculatePlacementBonus(placement);
    const raffleTickets = calculateRaffleTickets(placement, repsAdded || 0);

    // Update Firebase stats
    const userStatsRef = db.collection('users').doc(userId).collection('stats').doc('overview');
    const userStatsDoc = await userStatsRef.get();
    const currentStats = userStatsDoc.exists ? userStatsDoc.data() : { xp: 0, totalRaffleTickets: 0 };

    await userStatsRef.set({
      ...currentStats,
      xp: (currentStats.xp || 0) + xpAwarded,
      totalRaffleTickets: (currentStats.totalRaffleTickets || 0) + raffleTickets,
      lastRewardAt: new Date().toISOString(),
    }, { merge: true });

    // Add to reward history
    await db.collection('users').doc(userId).collection('rewards').doc(sessionId).set({
      sessionId,
      xpAwarded,
      raffleTickets,
      placement,
      repsAdded: repsAdded || 0,
      scoreAdded: scoreAdded || 0,
      awardedAt: new Date().toISOString(),
    });

    // Assign winner role if 1st place
    if (placement === 1) {
      try {
        const member = await guild.members.fetch(discordId);
        
        // Find or create winner role
        let winnerRole = guild.roles.cache.find(r => r.name === WINNER_ROLE_NAME);
        if (!winnerRole) {
          winnerRole = await guild.roles.create({
            name: WINNER_ROLE_NAME,
            color: '#FFD700',
            reason: 'Rivalis Live winner role',
          });
        }

        // Assign role
        if (!member.roles.cache.has(winnerRole.id)) {
          await member.roles.add(winnerRole, `Won Rivalis Live session ${sessionId}`);
          console.log(`✅ Assigned ${WINNER_ROLE_NAME} role to ${member.user.username}`);
        }
      } catch (error) {
        console.error('Failed to assign winner role:', error.message.substring(0, 100));
      }
    }

    // Send reward message to user in Discord
    try {
      const member = await guild.members.fetch(discordId);
      const embed = new EmbedBuilder()
        .setColor(placement === 1 ? '#FFD700' : placement === 2 ? '#C0C0C0' : placement === 3 ? '#CD7F32' : '#00FF00')
        .setTitle(`🏆 Session Performance Rewards`)
        .setDescription(`Great job in session ${sessionId}!`)
        .addFields(
          { name: '🥇 Placement', value: `#${placement}`, inline: true },
          { name: '⭐ XP Earned', value: `+${xpAwarded}`, inline: true },
          { name: '🎟️ Raffle Tickets', value: `+${raffleTickets}`, inline: true },
          { name: '📊 Reps', value: `${repsAdded || 0}`, inline: true },
          { name: '🎯 Score', value: `${scoreAdded || 0}`, inline: true },
          { name: '🔗 Hub Profile', value: 'View stats in Rivalis Hub' }
        )
        .setTimestamp();

      if (placement === 1) {
        embed.addFields({ name: '👑 Achievement', value: `You've been awarded the **${WINNER_ROLE_NAME}** role!` });
      }

      await member.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.warn('Could not send DM to user');
    }

    res.json({
      success: true,
      userId,
      xpAwarded,
      raffleTickets,
      placement,
      message: `Rewards granted: +${xpAwarded} XP, +${raffleTickets} raffle tickets`,
    });
  } catch (error) {
    console.error('🔥 Error in award-performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
