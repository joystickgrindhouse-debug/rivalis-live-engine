## 🔗 Discord VC Integration for Live Room Creation (Backend)

To integrate Discord voice channels with your live rooms, use the following logic in your backend (Node.js/Express) when handling Firestore room creation and deletion:

### Create Room and Discord VC

```js
// 1. Create the room in Firestore
const docRef = await addDoc(collection(db, "liveRooms"), roomData);
const roomId = docRef.id;

// 2. Create the Discord VC using the roomId as sessionId
const discordBotUrl = process.env.DISCORD_BOT_URL || "http://localhost:5000";
const createVcRes = await fetch(`${discordBotUrl}/create-vc`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: roomId })
});
const vcData = await createVcRes.json();

// 3. Store the inviteLink in the room document
if (vcData.inviteLink) {
  await updateDoc(docRef, { discordVcLink: vcData.inviteLink });
}
```

### Delete Room and Discord VC

```js
// When deleting the room
await fetch(`${discordBotUrl}/delete-vc`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: roomId })
});
await deleteDoc(doc(db, "liveRooms", roomId));
```

**Summary:**
- Use the Firestore-generated `roomId` as `sessionId` for Discord VC creation/deletion.
- Store the `inviteLink` in the room document for frontend use.
- Clean up the VC when the room is deleted.

# 🏋️ Rivalis Live - Multiplayer Fitness Game Server (Session Backend)

A high-performance, modular Node.js backend for multiplayer fitness gaming, optimized for **Android Termux low-resource environments**. Now acts as a session/room manager and Discord voice integration service. **All gameplay logic and validation is handled on the frontend (client or Hub).**

## 🎯 Architecture Overview

The system is split into two independent services:

```
┌─────────────────────────────────────────┐
│           Client (Game Logic)           │
└──────────────────┬──────────────────────┘
             │
     ┌───────────┴───────────┐
     ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ Live Server  │◄─────►│ Discord Bot  │
│   (8080)     │ HTTP  │   (5000)     │
└──────────────┘       └──────────────┘
 Session/Room           Voice Channel
 Management             Management
```

**Note:** All gameplay logic, validation, and state are now handled on the client/frontend. The backend only manages session/room lifecycle and Discord VC integration.

## ⚙️ Key Features


✅ **Performance Optimized**
- All session/room state in-memory (no database queries during active sessions)
- Minimal object allocations per message
- No clustering, no Redis required

✅ **Session Management Only**
- No game logic, rep validation, or turn management on backend
- All gameplay, validation, and anti-cheat handled by client/frontend


✅ **Security**
- Firebase ID token verification before connection (if enabled)
- No sensitive game logic or validation on backend


✅ **Reliability**
- Graceful disconnect handling
- Session memory cleanup on disconnect
- Crash protection with try/catch on all message parsing


✅ **Discord Integration**
- Lightweight discord.js configuration
- Temporary voice channels created per session
- Automatic invite link generation
- Channel cleanup on session end

## 📋 Requirements

### System
- Node.js 18+
- 250MB RAM for live server
- 150MB RAM for Discord bot
- Android Termux or Linux environment

### Dependencies (Approved Only)
```json
{
  "express": "^4.18.2",
  "ws": "^8.14.2",
  "firebase-admin": "^12.0.0",
  "dotenv": "^16.3.1",
  "uuid": "^9.0.1",
  "discord.js": "^14.13.0"
}
```

## 📁 Project Structure

```
rivalis/
├── live-server/
│   ├── server.js                 # Main Express + WebSocket server
│   ├── package.json              # Dependencies
│   ├── .env.example              # Environment template
│   ├── auth/
│   │   └── verifyFirebase.js    # Firebase token verification
│   ├── sockets/
│   │   └── socketHandler.js     # WebSocket connection & message routing
│   ├── game/
│   │   ├── sessionManager.js    # Session orchestration
│   │   ├── turnManager.js       # Turn progression & card effects
│   │   ├── repEngine.js         # Rep scoring & multipliers
│   │   ├── antiCheat.js         # Validation & pattern detection
│   │   ├── deckEngine.js        # Card deck management
│   │   └── eliminationEngine.js # Player elimination tracking
│   └── config/
│       └── limits.js             # Constants & thresholds
│
├── discord-bot/
│   ├── bot.js                   # Main Discord bot
│   ├── package.json             # Dependencies
│   └── .env.example             # Environment template
│
├── ecosystem.config.js          # PM2 configuration
└── README.md                    # This file
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Install live server dependencies
cd live-server
npm install

# Install bot dependencies
cd ../discord-bot
npm install

# Back to root
cd ..
```

### 2. Environment Setup

**Live Server** (`live-server/.env`):
```bash
PORT=8080
NODE_ENV=production
FIREBASE_SERVICE_ACCOUNT={...}  # Firebase service account JSON
DISCORD_BOT_URL=http://localhost:5000
```

**Discord Bot** (`discord-bot/.env`):
```bash
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id
BOT_PORT=5000
NODE_ENV=production
```

### 3. Run Services

#### Development (Terminal 1 - Live Server)
```bash
cd live-server
npm run dev
```

#### Development (Terminal 2 - Discord Bot)
```bash
cd discord-bot
npm run dev
```

#### Production with PM2
```bash
npm install -g pm2

# Start both services
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs

# Stop/Restart
pm2 restart all
pm2 stop all
```

## 🎮 Session Flow

### 1. Session Creation
```
POST /sessions
→ Returns sessionId
```

### 2. Player Join & Gameplay
```
All gameplay logic, validation, and state are handled on the client/frontend.
Backend only manages session/room lifecycle and Discord VC.
```

<!--
## 🎴 Card System (Client-side)

*All card/turn logic is now handled on the client/frontend.*
-->

<!--
## 🛡️ Anti-Cheat System (Client-side)

*All rep validation and anti-cheat logic is now handled on the client/frontend.*
-->

## 📊 Performance Characteristics

### Memory Usage
- Live Server: ~50MB baseline, +5-10MB per active session
- Discord Bot: ~40MB baseline, +1MB per active voice channel
- Zero memory growth during gameplay (all pooled objects)

### Concurrency
- Supports 10-30 concurrent players per instance
- Max 30 simultaneous WebSocket connections
- Max 8 players per session

### Latency
- Message round-trip: <50ms (local network)
- Rep validation: <5ms
- Turn advancement: <10ms

## 🔌 API Reference


### Live Server Endpoints

#### Health Check
```
GET /health
→ { uptime, activeSessions, memoryUsage }
```

#### Create Session
```
POST /sessions
→ { sessionId, status }
```

#### Get Session
```
GET /sessions/:sessionId
→ { sessionId, status }
```

#### Start Session
```
POST /sessions/:sessionId/start
→ { success, sessionId }
```

#### End Session
```
POST /sessions/:sessionId/end
→ { success, sessionId }
```

<!--
### WebSocket Messages (Client-side)

*All gameplay and messaging is now handled on the client/frontend.*
-->

### Discord Bot Endpoints

#### Create Voice Channel
```
POST /create-vc
Body: { sessionId, guildId? }
→ { channelId, channelName, inviteLink }
```

#### Delete Voice Channel
```
POST /delete-vc
Body: { sessionId }
→ { success, channelId }
```

#### Get Active Channels
```
GET /channels
→ { activeChannels: [...], count }
```

#### Health Check
```
GET /health
→ { status, botReady, activeChannels, memoryUsage }
```

## 📱 Android Termux Deployment

### Prerequisites
```bash
pkg install nodejs npm git
npm install -g pm2
```

### Setup
```bash
git clone https://github.com/your-repo/rivalis-live-engine.git
cd rivalis-live-engine
npm install --production

# Install PM2 globally
npm install -g pm2
```

### Run
```bash
# Terminal 1
termux-wake-lock
pm2 start ecosystem.config.js --env production
```

### Keep Alive
```bash
# Allow background execution
termux-job-scheduler --example

# Monitor RAM (should stay < 500MB total)
free -h
```


## 🔧 Configuration Tuning

Edit `live-server/config/limits.js`:

```javascript
// Adjust for your device capability
MAX_CONCURRENT_PLAYERS: 30,      // Reduce if memory constrained
LIVE_SERVER_MEMORY_LIMIT_MB: 250, // PM2 restart threshold
BOT_MEMORY_LIMIT_MB: 150,        // PM2 restart threshold
```

## 🐛 Troubleshooting

### High Memory Usage
- Check for connected socket leaks: `pm2 monit`
- Verify sessions are cleaned up: `curl localhost:8080/health`
- Reduce `MAX_CONCURRENT_PLAYERS` in config

### WebSocket Disconnects
- Ensure heartbeat interval is short enough
- Check firewall/NAT forwarding
- Verify client sends valid Firebase token

### Discord Bot Not Creating Channels
- Verify bot has permission in guild
- Check `DISCORD_GUILD_ID` is correct
- Ensure bot token is valid and not expired

### Sessions Not Ending
- Ensure frontend/game client is calling session end API
- Monitor console for errors

## 📈 Monitoring

### PM2 Dashboard
```bash
pm2 web              # HTTP dashboard on 9615
pm2 monit           # Terminal monitoring
```

### Health Endpoints
```bash
# Live server health
curl http://localhost:8080/health

# Bot health
curl http://localhost:5000/health
```

### Logs
```bash
pm2 logs            # Stream all logs
pm2 logs rivalis-live
pm2 logs rivalis-bot
```

## 🔐 Security Considerations

1. **Always require Firebase authentication** - Invalid tokens rejected before session join
2. **Enable request validation** - Messages validated before processing
3. **Rate limit** if behind reverse proxy
4. **Use environment variables** - Never hardcode secrets
5. **Monitor suspicion scores** - Early detection of cheaters
6. **Regular cleanup** - Old sessions cleaned automatically

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome. Please follow the existing code style and add tests for new features.

## 📞 Support

For issues, feature requests, or questions:
- 📧 Email: support@rivalis.dev
- 🐛 GitHub Issues: [repository/issues](https://github.com/your-repo/rivalis-live-engine/issues)
- 💬 Discord: [Join community server](https://discord.gg/rivalis)

---

**Built with ❤️ for Android Termux** | Optimized for low-resource environments