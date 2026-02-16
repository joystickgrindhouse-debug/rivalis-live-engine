# 🏋️ Rivalis Live - Production Multiplayer Fitness Game Server

A high-performance, modular Node.js multiplayer fitness gaming platform optimized for **Android Termux low-resource environments**. Built with WebSocket game engine and Discord voice integration.

## 🎯 Architecture Overview

The system is split into two independent services that communicate via HTTP locally:

```
┌─────────────────────────────────────────┐
│     Client (WebSocket Connections)       │
└──────────────────┬──────────────────────┘
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ Live Server  │◄─────►│ Discord Bot  │
│   (8080)     │ HTTP  │   (5000)     │
└──────────────┘       └──────────────┘
   WebSocket            Voice Channel
   Game Engine          Management
```

## ⚙️ Key Features

✅ **Performance Optimized**
- All session state in-memory (no database queries during active sessions)
- Minimal object allocations per message
- Memory-efficient Fisher-Yates deck shuffling
- Rolling window anti-cheat (no full rep history stored)
- No clustering, no Redis required

✅ **Game Mechanics**
- Turn-based multiplayer system with shuffled card deck
- Card effects with timestamp-based expiration (no setTimeout spam)
- Rep validation with anti-cheat detection
- Automatic player elimination after 2 consecutive failed turns
- Spectator mode for eliminated players

✅ **Security**
- Firebase ID token verification before connection
- Comprehensive rep validation (depth, form, time checks)
- Anti-cheat suspicion scoring system
- Replayed timestamp detection
- Pattern detection for botting/autoclickers

✅ **Reliability**
- WebSocket ping/pong heartbeat
- Graceful disconnect handling
- Automatic zombie connection cleanup
- Session memory cleanup on disconnect
- Crash protection with try/catch on all message parsing

✅ **Discord Integration**
- Lightweight discord.js configuration
- Temporary voice channels created per session
- Automatic invite link generation
- Channel cleanup on session end
- Only Guilds intent required (minimal memory)

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

## 🎮 Game Flow

### 1. Session Creation
```
POST /sessions
→ Returns sessionId
```

### 2. Player Join
```
WebSocket Connect + Bearer Token
Message: { type: 'join_session', sessionId, playerName }
```

### 3. Session Start
```
POST /sessions/:sessionId/start
→ Creates turn state, initializes deck
```

### 4. Rep Submission (During Active Turn)
```
Message: { 
  type: 'submit_rep', 
  rep: { 
    depth, 
    formScore, 
    repTimeMs, 
    timestamp 
  } 
}
→ Server validates, applies card effects, updates score
```

### 5. Turn Advancement
```
POST /sessions/:sessionId/advance-turn
→ Draws card, applies effect, broadcasts to players
```

### 6. Elimination Check
- Player fails 2 consecutive turns → eliminated
- Becomes spectator (can view, can't submit reps)
- Session ends when only 1 active player remains

## 🎴 Card System

### Card Types
- **FREEZE_OPPONENT**: Target can't submit reps for 2 turns
- **DOUBLE_REPS**: Next rep counts as 2 reps
- **STEAL_REP**: Rep count reduced for target
- **REVERSE_ORDER**: Turn order reverses
- **FORM_PENALTY**: Form threshold increased for target

### Deck Management
- 50 cards per deck (10 per type)
- Fisher-Yates shuffle (in-place, O(n) memory)
- Reshuffle from discard when draw empty
- Timestamp-based effect expiration (~2 turns)

## 🛡️ Anti-Cheat System

### Validation Rules
Each rep submission must pass:

1. **Time Validation**
   - 800ms - 3000ms per rep
   - Client timestamp within 5 seconds of server
   - Not within 100ms of last rep (replay prevention)

2. **Depth & Form Validation**
   - Depth ≥ 0.6 (60% of full range)
   - Form ≥ 0.5 (50% of perfect form)
   - Both normalized to 0-1 range

3. **Pattern Detection** (Suspicion Scoring)
   - Too fast reps (< 200ms between): +1 suspicion
   - Unnaturally perfect forms (5+ consecutive 0.95+): +1 suspicion
   - Suspicious depth drops (0.8 → 0.5): +1 suspicion
   - **Auto-kick at 5+ suspicion points**

4. **Rolling Window**
   - Only last 50 reps analyzed (memory efficient)
   - Suspicion decays by 1 per turn

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
→ { uptime, activeSessions, totalConnections, memoryUsage }
```

#### Create Session
```
POST /sessions
→ { sessionId, status }
```

#### Get Session
```
GET /sessions/:sessionId
→ { sessionId, status, playerCount, stats }
```

#### Start Session
```
POST /sessions/:sessionId/start
→ { success, sessionId }
```

#### Advance Turn
```
POST /sessions/:sessionId/advance-turn
→ { success, turnNumber, currentPlayer, drawnCard }
```

#### End Session
```
POST /sessions/:sessionId/end
→ { success, winnerId, leaderboard }
```

### WebSocket Messages

#### Join Session
```json
{
  "type": "join_session",
  "sessionId": "uuid...",
  "playerName": "PlayerName"
}
```

#### Submit Rep
```json
{
  "type": "submit_rep",
  "rep": {
    "depth": 0.85,
    "formScore": 0.92,
    "repTimeMs": 1200,
    "timestamp": 1707991234567
  }
}
```

#### Get Session Status
```json
{
  "type": "get_session_status"
}
```

#### Leave Session
```json
{
  "type": "leave_session"
}
```

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
TURN_TIME_MS: 120000,            // Increase for slower networks
MIN_REP_TIME_MS: 800,            // Adjust based on exercise type
MAX_REP_TIME_MS: 3000,           // Realistic max rep duration
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
- Check player elimination logic
- Verify `checkSessionEnd` is called after reps
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