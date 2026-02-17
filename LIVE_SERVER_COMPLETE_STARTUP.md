# Live Server Complete Startup Guide

Complete copy/paste ready commands to start the Rivalis Live Server for session hosting.

---

## 🚀 Quick Start (Copy/Paste This)

```bash
cd /workspaces/rivalis-live-engine/live-server
npm install
npm start
```

---

## 📋 Step-by-Step Startup

### 1. Navigate to Live Server Directory

```bash
cd /workspaces/rivalis-live-engine/live-server
```

### 2. Install Dependencies (First Time Only)

```bash
npm install
```

This installs:
- `express` - HTTP server framework
- `axios` - HTTP client for Discord bot calls
- `firebase-admin` - Authentication & database
- `dotenv` - Environment variables
- `uuid` - Session ID generation

### 3. Verify Environment Variables

```bash
cat .env
```

Should show:
```env
PORT=8080
NODE_ENV=production
DISCORD_BOT_URL=http://localhost:5000
FIREBASE_SERVICE_ACCOUNT={...}
HUB_API_URL=https://rivalislife.vercel.app/
HUB_API_SECRET=your_hub_api_secret_here
```

### 4. Fix Server (If Needed)

If you ran the trim script and server won't start:

```bash
# Replace with minimal version
cp server-minimal.js server.js
cp game/sessionManager-minimal.js game/sessionManager.js
```

### 5. Start the Server

```bash
npm start
```

**Or with node directly:**
```bash
node server.js
```

---

## ✅ Expected Output

```
🎮 ===== RIVALIS LIVE - SESSION HOST =====
🚀 Server running on port 8080
🔗 Discord Bot URL: http://localhost:5000
📝 Role: Session lifecycle management
⚠️  Game logic handled by Hub
=========================================
```

---

## 🧪 Test the Server

### Health Check

```bash
curl http://localhost:8080/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "uptime": 10.5,
  "activeSessions": 0,
  "memoryUsage": "45MB",
  "timestamp": "2026-02-16T12:00:00.000Z"
}
```

### Server Info

```bash
curl http://localhost:8080/
```

**Expected response:**
```json
{
  "name": "Rivalis Live Engine - Session Hosting",
  "version": "2.0.0",
  "status": "online",
  "role": "Backend utility service for session management",
  "note": "Game logic, rep validation, and scoring handled by Hub",
  "endpoints": {
    "health": "GET /health",
    "createSession": "POST /sessions",
    "getSession": "GET /sessions/:sessionId",
    "startSession": "POST /sessions/:sessionId/start",
    "endSession": "POST /sessions/:sessionId/end"
  }
}
```

### Create Session

```bash
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "gameMode": "classic",
    "exerciseName": "pushups",
    "hubSessionId": "hub-session-123"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "waiting",
  "gameMode": "classic",
  "discordVC": {
    "channelId": "1234567890123456789",
    "channelName": "Rivalis-a1b2c3d4",
    "guildId": "1470556354115801168",
    "inviteLink": "https://discord.gg/abc123xyz"
  },
  "createdAt": "2026-02-16T12:00:00.000Z"
}
```

**Note:** Discord VC creation will fail if Discord bot isn't running. That's OK - session still creates.

### Get Session Info

```bash
# Use sessionId from create response
curl http://localhost:8080/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Expected response:**
```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "waiting",
  "gameMode": "classic",
  "exerciseName": "pushups",
  "discordVC": {
    "channelId": "1234567890123456789",
    "inviteLink": "https://discord.gg/abc123xyz"
  },
  "createdAt": "2026-02-16T12:00:00.000Z",
  "startedAt": null,
  "endedAt": null
}
```

### Start Session

```bash
curl -X POST http://localhost:8080/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/start
```

**Expected response:**
```json
{
  "success": true,
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "active",
  "startedAt": "2026-02-16T12:05:00.000Z"
}
```

### End Session

```bash
curl -X POST http://localhost:8080/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/end \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "completed",
    "winner": {
      "userId": "user123",
      "score": 1000
    },
    "stats": {
      "totalReps": 42,
      "duration": 300
    }
  }'
```

**Expected response:**
```json
{
  "success": true,
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "ended",
  "endedAt": "2026-02-16T12:10:00.000Z",
  "endReason": "completed"
}
```

**Note:** This also deletes the Discord voice channel if bot is running.

### List All Sessions

```bash
curl http://localhost:8080/sessions
```

**Expected response:**
```json
{
  "sessions": [
    {
      "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "active",
      "gameMode": "classic",
      "exerciseName": "pushups",
      "discordLink": "https://discord.gg/abc123xyz",
      "createdAt": "2026-02-16T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## ⚙️ Configuration

### Environment Variables

**Required:**
```env
PORT=8080
DISCORD_BOT_URL=http://localhost:5000
```

**Optional:**
```env
NODE_ENV=production
FIREBASE_SERVICE_ACCOUNT={...}
HUB_API_URL=https://your-hub-domain.vercel.app/
HUB_API_SECRET=your_secret_here
```

### Change Port

Edit `.env`:
```bash
PORT=9000
```

**Note:** Port is hardcoded to 8080 in current version. To change, edit `server.js`:
```javascript
const PORT = 9000; // Change this line
```

### Change Discord Bot URL

For production:
```bash
echo "DISCORD_BOT_URL=https://your-discord-bot-domain.com" >> .env
```

Restart server after changes.

---

## 🎯 What the Server Does

### Session Lifecycle Management
- Creates unique session IDs
- Stores session metadata (gameMode, exercise, etc.)
- Tracks session status (waiting → active → ended)
- Links to Hub's session ID

### Discord Integration
- Calls Discord bot to create voice channels
- Stores Discord invite links with sessions
- Calls Discord bot to delete channels on end

### Session Cleanup
- Auto-removes ended sessions after 30 minutes
- Cleans up expired Discord VCs
- Memory-efficient in-memory storage

### What It Does NOT Do
- ❌ Game logic (Hub owns)
- ❌ Rep validation (Hub validates)
- ❌ Scoring (Hub calculates)
- ❌ Turn management (Hub controls)
- ❌ Player state (Hub tracks)
- ❌ WebSockets (Hub handles realtime)

---

## 🐛 Troubleshooting

### Server Won't Start

**Error: Cannot find module**
```
Error: Cannot find module './sockets/socketHandler'
Error: Cannot find module './config/gameModes'
```

**Fix - Use minimal server:**
```bash
cd /workspaces/rivalis-live-engine/live-server
cp server-minimal.js server.js
cp game/sessionManager-minimal.js game/sessionManager.js
npm start
```

---

**Error: Port already in use**
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Fix:**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change port
# Edit server.js: const PORT = 9000;

# Restart
npm start
```

---

**Error: Dependencies not installed**
```
Error: Cannot find module 'express'
```

**Fix:**
```bash
cd live-server
npm install
npm start
```

---

### Discord VC Not Creating

**Warning in logs:**
```
⚠️ Discord VC creation failed for session abc-123
```

**This is usually OK - means Discord bot isn't running.**

**To fix:**
1. Start Discord bot first:
   ```bash
   cd ../discord-bot
   npm start
   ```
2. Then start live server:
   ```bash
   cd ../live-server
   npm start
   ```

**Check Discord bot is reachable:**
```bash
curl http://localhost:5000/health
```

If Discord bot is down, sessions still work - just no voice channels.

---

### Sessions Not Persisting

**This is expected behavior!**

Sessions are stored **in-memory only**. When server restarts, all sessions are lost.

**Why?** This is a lightweight session hosting service. Hub owns the persistent game state.

**If you need persistence**, Hub should:
1. Create session in Live Server
2. Store session details in Hub's database
3. Link Hub's session ID to Live Server's session ID

---

## 🔄 Restart/Stop Commands

### Stop Server (Foreground)
```bash
# Press Ctrl+C
```

### Stop Server (Background)
```bash
# Find process
ps aux | grep "node server.js"

# Kill by PID
kill <PID>

# Or kill all node server processes
pkill -f "node server.js"
```

### Restart Server
```bash
cd live-server
npm start
```

### Run in Background (Linux/Mac)
```bash
cd live-server
nohup npm start > server.log 2>&1 &

# Check logs
tail -f server.log
```

### Run with PM2 (Production)
```bash
# Install PM2
npm install -g pm2

# Start server
cd live-server
pm2 start server.js --name rivalis-live

# View logs
pm2 logs rivalis-live

# Restart
pm2 restart rivalis-live

# Stop
pm2 stop rivalis-live

# Auto-start on system boot
pm2 startup
pm2 save
```

---

## 📡 All API Endpoints

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/` | GET | - | Server info |
| `/health` | GET | - | Server health & stats |
| `/sessions` | POST | `{gameMode?, exerciseName?, hubSessionId?}` | Session details + Discord VC |
| `/sessions` | GET | - | List all active sessions |
| `/sessions/:id` | GET | - | Get specific session |
| `/sessions/:id/start` | POST | - | Start session |
| `/sessions/:id/end` | POST | `{reason?, winner?, stats?}` | End session + cleanup VC |

---

## 🎮 Hub Integration Example

```javascript
// In your Hub backend

// 1. Create session in Live Server
const createLiveSession = async (roomData) => {
  const response = await fetch('http://localhost:8080/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameMode: roomData.mode,
      exerciseName: roomData.exercise,
      hubSessionId: roomData.id, // Link Hub's session
    }),
  });
  
  const liveSession = await response.json();
  
  // Store Live Server session ID and Discord invite
  roomData.liveSessionId = liveSession.sessionId;
  roomData.discordInvite = liveSession.discordVC?.inviteLink;
  
  return roomData;
};

// 2. Start session when match begins
const startLiveSession = async (liveSessionId) => {
  await fetch(`http://localhost:8080/sessions/${liveSessionId}/start`, {
    method: 'POST',
  });
};

// 3. End session when match finishes
const endLiveSession = async (liveSessionId, winner, stats) => {
  // End in Live Server (deletes Discord VC)
  await fetch(`http://localhost:8080/sessions/${liveSessionId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: 'completed',
      winner: {
        userId: winner.id,
        score: winner.finalScore,
      },
      stats: {
        totalReps: stats.totalReps,
        duration: stats.durationMs,
      },
    }),
  });
  
  // Announce winner in Discord
  await fetch('http://localhost:5000/announce-winner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: liveSessionId,
      winnerDiscordId: winner.discordId,
      winnerName: winner.username,
      winnerScore: winner.finalScore,
      exerciseName: stats.exercise,
      totalReps: stats.totalReps,
    }),
  });
};

// 4. Check session status
const getLiveSessionStatus = async (liveSessionId) => {
  const response = await fetch(`http://localhost:8080/sessions/${liveSessionId}`);
  return await response.json();
};
```

---

## 🚀 Production Deployment

### Railway

1. Push to GitHub
2. Connect to Railway
3. Set environment variables:
   ```
   PORT=8080
   DISCORD_BOT_URL=https://your-discord-bot-url.railway.app
   NODE_ENV=production
   ```
4. Deploy automatically

### Render

1. Connect GitHub repo
2. Build command: `cd live-server && npm install`
3. Start command: `cd live-server && npm start`
4. Environment variables: Same as Railway

### Heroku

```bash
# In live-server/
heroku create rivalis-live-server
heroku config:set DISCORD_BOT_URL=https://your-bot.herokuapp.com
git push heroku main
```

---

## 📊 Server Architecture

```
┌─────────────────┐
│   Hub Frontend  │  (Game UI, Logic, Validation)
└────────┬────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌────────────────┐       ┌─────────────────┐
│  Live Server   │◄─────►│  Discord Bot    │
│   Port 8080    │       │   Port 5000     │
├────────────────┤       ├─────────────────┤
│ • Create       │       │ • Voice channels│
│   sessions     │       │ • Announcements │
│ • Track status │       │ • Stacking roles│
│ • Link Discord │       │ • Rewards       │
│ • Cleanup      │       └─────────────────┘
└────────────────┘
         │
         ▼
  sessions Map (in-memory)
  { sessionId → sessionData }
```

**Responsibility:**
- Hub = Game authority (logic, scoring, validation)
- Live Server = Session hosting
- Discord Bot = Discord integration

---

## 📚 Related Documentation

- [DISCORD_BOT_COMPLETE_STARTUP.md](DISCORD_BOT_COMPLETE_STARTUP.md) - Discord bot startup
- [BACKEND_ONLY_SETUP.md](BACKEND_ONLY_SETUP.md) - Full backend architecture
- [TRIM_IMPLEMENTATION_GUIDE.md](TRIM_IMPLEMENTATION_GUIDE.md) - Code cleanup guide

---

## ✅ Success Checklist

- [ ] Server starts on port 8080
- [ ] Health endpoint returns 200
- [ ] Can create sessions
- [ ] Sessions return unique IDs
- [ ] Discord VCs created (if bot running)
- [ ] Can start sessions
- [ ] Can end sessions
- [ ] Sessions appear in list
- [ ] Memory usage reasonable (<100MB)
- [ ] Hub integration tested

---

## 🎉 You're All Set!

Your Live Server is now running with:
- ✅ Session lifecycle management
- ✅ Discord VC integration
- ✅ Minimal memory footprint
- ✅ Clean API for Hub integration

**Server is live on:** http://localhost:8080

Ready to host matches! 🎮
