# Discord Bot Startup Guide

Quick reference for starting the Rivalis Discord bot with winner announcements and stacking roles.

---

## 🚀 Quick Start

### Option 1: Use Startup Script (Recommended)

```bash
chmod +x START_DISCORD_BOT.sh
./START_DISCORD_BOT.sh
```

### Option 2: Manual Start

```bash
cd discord-bot
npm install  # First time only
npm start
```

---

## ✅ Prerequisites

### 1. Environment Variables

Your `.env` file is already configured with:

```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
BOT_PORT=5000
FIREBASE_SERVICE_ACCOUNT={...}
```

### 2. Optional: Winner Announcements

Add these to `.env` if you want winner announcements:

```bash
# Channel where winners are announced
DISCORD_WINNER_CHANNEL_ID=your_channel_id_here

# Role name for winners (generates Champion, Champion x2, etc.)
WINNER_ROLE_NAME=Champion

# How long roles last (in minutes)
DISCORD_PREMIUM_ROLE_DURATION_MINUTES=60
```

To get your channel ID:
1. Enable Discord Developer Mode: Settings → Advanced → Developer Mode
2. Right-click your announcements channel → Copy ID
3. Paste into `.env`

---

## 🎯 What the Bot Does

### Voice Channel Management
- `POST /create-vc` - Creates temporary Discord voice channels
- `POST /delete-vc` - Removes channels when matches end
- Auto-cleanup after 1 hour

### Winner Announcements (NEW!)
- `POST /announce-winner` - Announces winners to Discord
- **Stacking roles:** Champion → Champion x2 → ... → Champion x7
- Rich embeds with match stats
- Auto-expires after 60 minutes

### Rewards System
- `POST /award-performance` - Grants XP and raffle tickets
- DM performance summaries to players

### Social Sharing
- `POST /share/generate` - Creates shareable match results
- `POST /share/track` - Tracks shares for bonuses

---

## 🔍 Verify Startup

### 1. Check Console Output

You should see:
```
✅ Discord bot ready! Logged in as YourBotName#1234
🌐 HTTP server listening on port 5000
```

### 2. Test Health Endpoint

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 5.123,
  "botReady": true,
  "guildId": "1470556354115801168"
}
```

### 3. Test Voice Channel Creation

```bash
curl -X POST http://localhost:5000/create-vc \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session-123"}'
```

Expected response:
```json
{
  "channelId": "...",
  "channelName": "Rivalis-test-session",
  "guildId": "1470556354115801168",
  "inviteLink": "https://discord.gg/..."
}
```

### 4. Test Winner Announcement

```bash
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"test-123",
    "winnerDiscordId":"YOUR_DISCORD_USER_ID",
    "winnerName":"TestPlayer",
    "winnerScore":1000,
    "exerciseName":"pushups",
    "totalReps":20
  }'
```

**To get your Discord user ID:**
1. Enable Developer Mode in Discord
2. Right-click your profile → Copy ID

Expected response:
```json
{
  "success": true,
  "sessionId": "test-123",
  "winnerName": "TestPlayer",
  "winnerScore": 1000,
  "roleGrant": {
    "granted": true,
    "roleId": "...",
    "roleName": "Champion",
    "stackCount": 1,
    "durationMinutes": 60
  },
  "announcement": {
    "sent": true,
    "channelId": "..."
  }
}
```

---

## 🔧 Troubleshooting

### Bot Not Starting

**Check Discord token:**
```bash
echo $DISCORD_TOKEN
# Should show your bot token
```

**Regenerate token if needed:**
1. Go to https://discord.com/developers/applications
2. Select your application
3. Bot tab → Reset Token
4. Copy new token to `.env`

### Voice Channels Not Creating

**Check bot permissions:**
- Bot needs `MANAGE_CHANNELS` permission
- Bot needs `CREATE_INSTANT_INVITE` permission

**Add permissions:**
1. Discord Server Settings → Roles
2. Find your bot's role
3. Enable: Manage Channels, Create Invite

### Winner Announcements Not Appearing

**Check channel ID:**
```bash
# Make sure DISCORD_WINNER_CHANNEL_ID is set
grep DISCORD_WINNER_CHANNEL_ID discord-bot/.env
```

**Check bot can see the channel:**
- Bot must have access to the announcement channel
- Bot needs `SEND_MESSAGES` and `EMBED_LINKS` permissions

### Roles Not Being Granted

**Check role hierarchy:**
- Bot's role must be HIGHER than roles it creates
- Drag bot role above "Champion" roles in Server Settings → Roles

**Check bot permissions:**
- Bot needs `MANAGE_ROLES` permission

---

## 🎮 Integration with Hub

When a match ends in Hub, call the bot's endpoints:

```javascript
// 1. Create voice channel when room is created
const vcResponse = await fetch('http://localhost:5000/create-vc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: room.id }),
});
const { inviteLink } = await vcResponse.json();

// 2. Announce winner when match ends
await fetch('http://localhost:5000/announce-winner', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: room.id,
    winnerDiscordId: winner.discordId,
    winnerName: winner.username,
    winnerScore: winner.finalScore,
    exerciseName: room.exercise,
    totalReps: winner.totalReps,
  }),
});

// 3. Delete voice channel
await fetch('http://localhost:5000/delete-vc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: room.id }),
});
```

---

## 📊 Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/create-vc` | POST | Create voice channel |
| `/delete-vc` | POST | Delete voice channel |
| `/channels` | GET | List active channels |
| `/announce-winner` | POST | Announce winner + grant role |
| `/award-performance` | POST | Grant XP/tickets |
| `/share/generate` | POST | Generate share content |
| `/share/track` | POST | Track social shares |

---

## 🛑 Stopping the Bot

### If running in foreground:
Press `Ctrl+C`

### If running in background:
```bash
# Find process
ps aux | grep "node bot.js"

# Kill process
kill <PID>

# Or kill all node processes (careful!)
pkill -f "node bot.js"
```

---

## 📚 Further Reading

- [DISCORD_WINNER_QUICK_START.md](DISCORD_WINNER_QUICK_START.md) - 5 min setup
- [DISCORD_STACKING_ROLES_SYSTEM.md](DISCORD_STACKING_ROLES_SYSTEM.md) - Full system docs
- [BACKEND_ONLY_SETUP.md](BACKEND_ONLY_SETUP.md) - Complete backend guide

---

## 🎉 Success!

If you see this output, you're all set:

```
✅ Discord bot ready! Logged in as RivalisBot#1234
🌐 HTTP server listening on port 5000

Available endpoints:
  POST /create-vc
  POST /delete-vc
  POST /announce-winner
  POST /award-performance
  GET  /health
```

The bot is now running and ready to:
- ✅ Create Discord voice channels
- ✅ Announce winners publicly
- ✅ Grant stacking roles (up to 7x)
- ✅ Award XP and raffle tickets
- ✅ Track social shares

🚀 Ready to compete! 🏆
