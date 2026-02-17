# Trim Unused Code - Implementation Guide

This guide walks you through removing all game logic code that Hub now owns, leaving only essential backend services (session hosting + Discord integration).

---

## 🎯 What Gets Removed

### From Live Server:
- ❌ Game logic (cards, turns, scoring) - Hub owns
- ❌ Rep validation - Hub validates  
- ❌ Anti-cheat engine - Hub validates
- ❌ Pose validation - Hub handles
- ❌ WebSocket handlers - Hub does realtime
- ❌ Frontend files (HTML/CSS/JS) - Hub is frontend
- ❌ Exercise scoring endpoints - Hub scores

### What Stays:
- ✅ Session lifecycle API (create, start, end)
- ✅ Discord VC integration
- ✅ Health checks
- ✅ Basic session storage

---

## 📋 Step-by-Step Trimming

### Option 1: Automated Script (Recommended)

```bash
# Make script executable
chmod +x TRIM_UNUSED_CODE.sh

# Review what will be archived
cat TRIM_UNUSED_CODE.sh

# Run the trimming script
./TRIM_UNUSED_CODE.sh

# Review archived files
ls -la _archive_trimmed/
```

This will:
1. Archive game logic files to `_archive_trimmed/`
2. Archive frontend files
3. Archive unused configs
4. Keep only session hosting essentials

---

### Option 2: Manual Minimal Setup (Clean Slate)

**Use the new minimal files:**

```bash
# Backup original files
cd live-server
cp server.js server-original.js
cp game/sessionManager.js game/sessionManager-original.js

# Switch to minimal versions
cp server-minimal.js server.js
cp game/sessionManager-minimal.js game/sessionManager.js

# Remove game logic dependencies from server.js
# (already done in server-minimal.js)
```

**Update package.json to remove unused dependencies:**

```bash
cd live-server
npm uninstall ws  # WebSocket not needed if Hub handles realtime
```

---

## ✅ Verify Minimal Setup

### 1. Test Live Server

```bash
cd live-server
npm start
```

Expected output:
```
🎮 ===== RIVALIS LIVE - SESSION HOST =====
🚀 Server running on port 8080
🔗 Discord Bot URL: http://localhost:5000
📝 Role: Session lifecycle management
⚠️  Game logic handled by Hub
=========================================
```

### 2. Test Health Check

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 5.234,
  "activeSessions": 0,
  "memoryUsage": "45MB",
  "timestamp": "2026-02-16T12:00:00.000Z"
}
```

### 3. Test Session Creation

```bash
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "gameMode": "classic",
    "exerciseName": "pushups",
    "hubSessionId": "hub-session-123"
  }'
```

Expected response:
```json
{
  "success": true,
  "sessionId": "abc-123-def-456",
  "status": "waiting",
  "gameMode": "classic",
  "discordVC": {
    "channelId": "...",
    "inviteLink": "https://discord.gg/..."
  },
  "createdAt": "2026-02-16T12:00:00.000Z"
}
```

### 4. Test Session Lifecycle

```bash
# Start session
curl -X POST http://localhost:8080/sessions/abc-123-def-456/start

# Get session info
curl http://localhost:8080/sessions/abc-123-def-456

# End session
curl -X POST http://localhost:8080/sessions/abc-123-def-456/end \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "completed",
    "winner": {"userId": "user123", "score": 1000}
  }'
```

---

## 🗂️ Final Structure

After trimming, your repo should look like:

```
rivalis-live-engine/
├── live-server/
│   ├── server.js              (minimal - session hosting only)
│   ├── game/
│   │   └── sessionManager.js  (minimal - lifecycle only)
│   ├── package.json
│   └── .env
│
├── discord-bot/
│   ├── bot.js                 (VC + winner announcements + stacking roles)
│   ├── package.json
│   └── .env
│
├── _archive_trimmed/          (all removed code archived here)
│   ├── live-server/
│   │   ├── game/              (antiCheat, repEngine, turnManager, etc.)
│   │   ├── config/            (cardValues, gameModes, etc.)
│   │   ├── sockets/           (WebSocket handlers)
│   │   └── public/            (Frontend files)
│   ├── root/                  (Example files, JSONs)
│   └── docs/                  (Outdated docs)
│
├── BACKEND_ONLY_SETUP.md
├── DISCORD_WINNER_QUICK_START.md
├── DISCORD_STACKING_ROLES_SYSTEM.md
└── README.md
```

---

## 🔗 Hub Integration

After trimming, Hub should call these Live Server endpoints:

### Create Session
```javascript
const response = await fetch('https://live-engine-url/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameMode: 'classic',
    exerciseName: 'pushups',
    hubSessionId: hubSession.id,
  }),
});
const { sessionId, discordVC } = await response.json();
```

### Start Session
```javascript
await fetch(`https://live-engine-url/sessions/${sessionId}/start`, {
  method: 'POST',
});
```

### End Session + Announce Winner
```javascript
// 1. End session in Live Server
await fetch(`https://live-engine-url/sessions/${sessionId}/end`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'completed',
    winner: { userId: winner.id, score: winner.finalScore },
  }),
});

// 2. Announce winner via Discord Bot
await fetch('https://discord-bot-url/announce-winner', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    winnerDiscordId: winner.discordId,
    winnerName: winner.username,
    winnerScore: winner.finalScore,
    exerciseName: session.exercise,
    totalReps: winner.totalReps,
  }),
});
```

---

## 📊 Before vs After

| Component | Before | After |
|-----------|--------|-------|
| **Live Server Lines** | ~512 lines | ~280 lines |
| **SessionManager Lines** | ~458 lines | ~115 lines |
| **Game Logic Files** | 7 files | 0 files |
| **Public/Frontend Files** | 10+ files | 0 files |
| **Config Files** | 6 files | 2 files (optional) |
| **Responsibility** | Full game engine | Session hosting only |

---

## 🚀 Deploy Trimmed Version

### Railway Deployment

```bash
# Commit trimmed version
git add -A
git commit -m "Trim to backend-only: session hosting + Discord bot"
git push origin main

# Railway will auto-deploy
```

### Environment Variables

**Live Server (.env):**
```env
PORT=8080
DISCORD_BOT_URL=https://your-discord-bot-url
NODE_ENV=production
```

**Discord Bot (.env):**
```env
BOT_PORT=5000
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id
DISCORD_WINNER_CHANNEL_ID=your_channel_id
WINNER_ROLE_NAME=Champion
DISCORD_PREMIUM_ROLE_DURATION_MINUTES=60
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
NODE_ENV=production
```

---

## 🔄 Rollback

If you need to restore game logic:

```bash
# Restore from archive
cp -r _archive_trimmed/live-server/game/* live-server/game/
cp -r _archive_trimmed/live-server/config/* live-server/config/
cp -r _archive_trimmed/live-server/sockets/* live-server/sockets/

# Or restore from git
git checkout HEAD~1 live-server/
```

---

## ✅ Success Checklist

- [ ] Live Server starts without errors
- [ ] Health endpoint returns 200
- [ ] Session creation works
- [ ] Discord VC created on session creation
- [ ] Session lifecycle endpoints work
- [ ] Discord winner announcements work
- [ ] Stacking roles grant correctly
- [ ] Hub integration tested end-to-end
- [ ] Memory usage reduced (check `/health`)
- [ ] No unused dependencies in package.json

---

## 📚 Documentation

After trimming, these docs remain relevant:
- ✅ **BACKEND_ONLY_SETUP.md** - Complete backend setup guide
- ✅ **DISCORD_WINNER_QUICK_START.md** - Discord setup (5 min)
- ✅ **DISCORD_STACKING_ROLES_SYSTEM.md** - Full role system reference
- ✅ **README.md** - Main project overview

Archive these outdated docs:
- ❌ EXERCISE_SYSTEM.md (Hub owns)
- ❌ FIREBASE_PROFILE_SYNC_INTEGRATION.md (Hub owns)
- ❌ INTEGRATION_INSTRUCTIONS.md (Outdated)
- ❌ BOT_SYSTEM.md (Replaced by new Discord docs)

---

## 🎉 Result

You now have a **lean, focused backend** that:
- ✅ Handles session lifecycle only
- ✅ Integrates Discord VC creation
- ✅ Supports Discord winner announcements
- ✅ Grants stacking roles (up to 7x)
- ✅ Minimal memory footprint
- ✅ Clear separation of concerns with Hub

**Hub owns:** Game logic, rep validation, scoring, UI, realtime  
**Live Engine owns:** Session hosting, Discord integration

Perfect architecture for your hybrid setup! 🚀
