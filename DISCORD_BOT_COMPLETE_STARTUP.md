# Discord Bot Complete Startup Guide

Complete copy/paste ready commands to start the Rivalis Discord bot with voice channels, winner announcements, and stacking roles (up to 7x).

---

## 🚀 Quick Start (Copy/Paste This)

```bash
cd /workspaces/rivalis-live-engine/discord-bot
npm install
npm start
```

---

## 📋 Step-by-Step Startup

### 1. Navigate to Discord Bot Directory

```bash
cd /workspaces/rivalis-live-engine/discord-bot
```

### 2. Install Dependencies (First Time Only)

```bash
npm install
```

This installs:
- `discord.js` - Discord API wrapper
- `express` - HTTP server for endpoints
- `firebase-admin` - Database for role stacking
- `sharp` - Image processing
- `dotenv` - Environment variables

### 3. Verify Environment Variables

```bash
cat .env
```

Should show:
```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
BOT_PORT=5000
FIREBASE_SERVICE_ACCOUNT={...}
```

### 4. Start the Bot

```bash
npm start
```

**Or with node directly:**
```bash
node bot.js
```

---

## ✅ Expected Output

```
🤖 ===== RIVALIS DISCORD BOT =====
🔗 Connecting to Discord...
✅ Discord bot ready! Logged in as RivalisBot#1234
👥 Connected to guild: Your Server Name (ID: 1470556354115801168)
🌐 HTTP server listening on port 5000

📡 Available endpoints:
  POST /create-vc          - Create voice channel
  POST /delete-vc          - Delete voice channel
  GET  /channels           - List active channels
  POST /announce-winner    - Announce winner + stacking roles
  POST /award-performance  - Grant XP & raffle tickets
  POST /share/generate     - Generate share content
  POST /share/track        - Track social shares
  GET  /health             - Health check

🎮 Bot ready for matches!
```

---

## 🧪 Test the Bot

### Health Check

```bash
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "uptime": 5.234,
  "botReady": true,
  "guildId": "1470556354115801168",
  "activeChannels": 0
}
```

### Create Voice Channel

```bash
curl -X POST http://localhost:5000/create-vc \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123"
  }'
```

**Expected response:**
```json
{
  "channelId": "1234567890123456789",
  "channelName": "Rivalis-test-ses",
  "guildId": "1470556354115801168",
  "inviteLink": "https://discord.gg/abc123xyz"
}
```

### Test Winner Announcement (Stacking Roles)

**Get your Discord user ID:**
1. Enable Developer Mode: Discord Settings → Advanced → Developer Mode
2. Right-click your profile → Copy ID

**Test announcement:**
```bash
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "winnerDiscordId": "YOUR_DISCORD_USER_ID_HERE",
    "winnerName": "FitWarrior",
    "winnerScore": 1000,
    "exerciseName": "pushups",
    "totalReps": 20
  }'
```

**Expected response:**
```json
{
  "success": true,
  "sessionId": "test-session-123",
  "winnerName": "FitWarrior",
  "winnerScore": 1000,
  "roleGrant": {
    "granted": true,
    "roleId": "987654321098765432",
    "roleName": "Champion",
    "stackCount": 1,
    "durationMinutes": 60
  },
  "announcement": {
    "sent": true,
    "channelId": "1234567890123456789"
  }
}
```

**Run multiple times to test stacking:**
- 1st call → `"roleName": "Champion"`
- 2nd call → `"roleName": "Champion x2"`
- 3rd call → `"roleName": "Champion x3"`
- ...up to x7

### Delete Voice Channel

```bash
curl -X POST http://localhost:5000/delete-vc \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "channelId": "1234567890123456789",
  "message": "Channel deleted successfully"
}
```

---

## ⚙️ Configuration Options

### Enable Winner Announcements

Add to `.env`:

```bash
# Channel where winners are announced
DISCORD_WINNER_CHANNEL_ID=1234567890123456789

# Role name base (generates Champion, Champion x2, etc.)
WINNER_ROLE_NAME=Champion

# How long roles last before auto-removal (minutes)
DISCORD_PREMIUM_ROLE_DURATION_MINUTES=60
```

**To get channel ID:**
1. Enable Developer Mode in Discord
2. Right-click your announcements channel
3. Copy ID
4. Paste into `.env`

### Restart After Config Changes

```bash
# Stop bot (Ctrl+C if running in foreground)
# Then restart:
npm start
```

---

## 🎯 What the Bot Does

### 1. Voice Channel Management
- Creates temporary voice channels for match sessions
- Generates Discord invite links
- Auto-deletes channels when matches end
- Cleanup expired channels (>1 hour old)

### 2. Winner Announcements (NEW!)
- Public announcements in Discord channel
- Rich embeds with match stats
- Mentions winner
- Shows exercise, reps, score

### 3. Stacking Roles (NEW!)
- Winners get progressively upgraded roles
- 7 levels: Champion → Champion x2 → ... → Champion x7
- Each level has unique color (Gold → Orange → Red → Dark Red)
- Old role auto-removed when upgraded
- Roles auto-expire after 60 minutes
- Stack count persists in Firebase

### 4. Rewards System
- Awards XP based on performance
- Grants raffle tickets
- DMs performance summaries
- Tracks stats in Firebase

### 5. Social Sharing
- Generates shareable match results
- Creates preview images
- Provides platform-specific templates
- Tracks shares for bonuses

---

## 🐛 Troubleshooting

### Bot Won't Start

**Error: Invalid token**
```
Error: An invalid token was provided
```

**Fix:**
1. Go to https://discord.com/developers/applications
2. Select your application → Bot tab
3. Click "Reset Token" → Copy new token
4. Update `.env`: `DISCORD_TOKEN=new_token_here`
5. Restart: `npm start`

---

**Error: Cannot find module**
```
Error: Cannot find module 'discord.js'
```

**Fix:**
```bash
cd discord-bot
npm install
npm start
```

---

**Error: Port 5000 already in use**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Fix:**
```bash
# Find and kill process using port 5000
lsof -ti:5000 | xargs kill -9

# Or change port in .env
echo "BOT_PORT=5001" >> .env

# Restart
npm start
```

---

### Voice Channels Not Creating

**Error: Missing permissions**

**Fix:**
1. Go to Discord Server Settings → Roles
2. Find your bot's role
3. Enable these permissions:
   - ✅ Manage Channels
   - ✅ Create Instant Invite
   - ✅ View Channels
4. Restart bot

---

### Winner Announcements Not Appearing

**Check channel ID is set:**
```bash
grep DISCORD_WINNER_CHANNEL_ID discord-bot/.env
```

**If not set:**
1. Enable Developer Mode in Discord
2. Right-click your announcements channel → Copy ID
3. Add to `.env`:
   ```bash
   echo "DISCORD_WINNER_CHANNEL_ID=paste_id_here" >> .env
   ```
4. Restart bot

**Check bot has channel access:**
1. Go to channel settings → Permissions
2. Add your bot role
3. Enable:
   - ✅ View Channel
   - ✅ Send Messages
   - ✅ Embed Links

---

### Roles Not Being Granted

**Check role hierarchy:**
1. Server Settings → Roles
2. Drag bot's role ABOVE "Champion" roles
3. Bot's role must be higher to manage roles below it

**Check bot permissions:**
- ✅ Manage Roles

**Check Firebase connection:**
```bash
# Bot logs should show:
✅ Firebase Admin initialized
```

If Firebase error, verify `FIREBASE_SERVICE_ACCOUNT` in `.env` is valid JSON.

---

## 🔄 Restart/Stop Commands

### Stop Bot (Foreground)
```bash
# Press Ctrl+C
```

### Stop Bot (Background)
```bash
# Find process
ps aux | grep "node bot.js"

# Kill by PID
kill <PID>

# Or kill all node bot processes
pkill -f "node bot.js"
```

### Restart Bot
```bash
cd discord-bot
npm start
```

### Run in Background (Linux/Mac)
```bash
cd discord-bot
nohup npm start > bot.log 2>&1 &

# Check logs
tail -f bot.log
```

### Run with PM2 (Production)
```bash
# Install PM2
npm install -g pm2

# Start bot
cd discord-bot
pm2 start bot.js --name rivalis-bot

# View logs
pm2 logs rivalis-bot

# Restart
pm2 restart rivalis-bot

# Stop
pm2 stop rivalis-bot

# Auto-start on system boot
pm2 startup
pm2 save
```

---

## 📡 All API Endpoints

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/health` | GET | - | Bot status & stats |
| `/create-vc` | POST | `{sessionId}` | Channel ID & invite link |
| `/delete-vc` | POST | `{sessionId}` | Success confirmation |
| `/channels` | GET | - | List of active channels |
| `/announce-winner` | POST | `{sessionId, winnerDiscordId, winnerName, winnerScore, exerciseName, totalReps}` | Role grant details |
| `/award-performance` | POST | `{userId, discordId, placement, repsAdded, scoreAdded, sessionId}` | XP & tickets awarded |
| `/share/generate` | POST | `{userId, username, placement, exercise, reps, score, sessionId}` | Share URLs & content |
| `/share/track` | POST | `{shareId, platform, url}` | Tracking confirmation |

---

## 🎮 Hub Integration Example

```javascript
// When creating a room in Hub
const createRoomWithDiscordVC = async (roomData) => {
  // 1. Create voice channel
  const vcResponse = await fetch('http://localhost:5000/create-vc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: roomData.id }),
  });
  const { inviteLink } = await vcResponse.json();
  
  // Store invite link in room
  roomData.discordInvite = inviteLink;
  
  return roomData;
};

// When a match ends in Hub
const announceMatchWinner = async (sessionId, winner, matchData) => {
  // Announce winner
  await fetch('http://localhost:5000/announce-winner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      winnerDiscordId: winner.discordId,
      winnerName: winner.username,
      winnerScore: winner.finalScore,
      exerciseName: matchData.exercise,
      totalReps: winner.totalReps,
    }),
  });
  
  // Delete voice channel
  await fetch('http://localhost:5000/delete-vc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
};
```

---

## 📚 Related Documentation

- [DISCORD_STACKING_ROLES_SYSTEM.md](DISCORD_STACKING_ROLES_SYSTEM.md) - Complete role system reference
- [DISCORD_WINNER_QUICK_START.md](DISCORD_WINNER_QUICK_START.md) - 5-minute setup guide
- [BACKEND_ONLY_SETUP.md](BACKEND_ONLY_SETUP.md) - Full backend architecture

---

## ✅ Success Checklist

- [ ] Bot starts without errors
- [ ] Health endpoint returns 200
- [ ] Voice channels can be created
- [ ] Invite links are generated
- [ ] Winner announcements appear in Discord
- [ ] Roles are granted correctly
- [ ] Roles stack up (x2, x3, etc.)
- [ ] Roles auto-expire after 60 minutes
- [ ] Firebase connection working
- [ ] Hub integration tested

---

## 🎉 You're All Set!

Your Discord bot is now running with:
- ✅ Voice channel management
- ✅ Winner announcements
- ✅ Stacking roles (up to 7x)
- ✅ Rewards system
- ✅ Social sharing tools

**Bot is live on:** http://localhost:5000

Ready to compete! 🏆
