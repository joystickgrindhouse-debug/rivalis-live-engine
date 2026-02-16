# 🎯 Rivalis Live - Quick Reference

## 📡 WebSocket Connection

### Connect
```javascript
const token = "firebase_id_token";
const ws = new WebSocket("ws://localhost:8080", {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Messages

**Join Session**
```json
{
  "type": "join_session",
  "sessionId": "uuid...",
  "playerName": "Player Name"
}
```

**Submit Rep**
```json
{
  "type": "submit_rep",
  "rep": {
    "depth": 0.85,           // 0-1 (must be ≥0.6)
    "formScore": 0.92,       // 0-1 (must be ≥0.5)
    "repTimeMs": 1200,       // 800-3000ms
    "timestamp": 1707991200  // Date.now()
  }
}
```

**Get Status**
```json
{
  "type": "get_session_status"
}
```

**Leave Session**
```json
{
  "type": "leave_session"
}
```

---

## 🔗 HTTP Endpoints

### Session Management

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/sessions` | {} |
| GET | `/sessions/:id` | - |
| POST | `/sessions/:id/start` | {} |
| POST | `/sessions/:id/end` | {} |
| POST | `/sessions/:id/advance-turn` | {} |
| GET | `/health` | - |

### Response Format
```json
{
  "sessionId": "uuid",
  "status": "waiting|active|finished",
  "playerCount": 5,
  "stats": {
    "turnNumber": 10,
    "uptime": 123456
  }
}
```

---

## 🤖 Discord Bot Endpoints

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/create-vc` | `{ sessionId, guildId? }` |
| POST | `/delete-vc` | `{ sessionId }` |
| GET | `/channels` | - |
| GET | `/health` | - |

### Create Voice Channel Response
```json
{
  "channelId": "123...",
  "channelName": "Rivalis-abc123de",
  "guildId": "456...",
  "inviteLink": "https://discord.gg/..."
}
```

---

## 🎴 Card Effects

| Card | Effect | Duration |
|------|--------|----------|
| FREEZE_OPPONENT | Can't submit reps | 2 turns (~120s) |
| DOUBLE_REPS | Next rep = 2 reps | 1 rep |
| STEAL_REP | Reduce opponent reps | 2 turns |
| REVERSE_ORDER | Turn order reverses | Until end turn |
| FORM_PENALTY | Form check 0.8x | 2 turns |

---

## 🛡️ Anti-Cheat Validation

### Rep Must Have
- ✅ depth: 0.6-1.0
- ✅ formScore: 0.5-1.0
- ✅ repTimeMs: 800-3000
- ✅ timestamp: ±5000ms from server

### Auto-Kick Triggers
- 🚫 5+ suspicion points
- 🚫 Invalid token
- 🚫 Malformed JSON
- 🚫 Message > 4KB

### Suspicion Scoring
- +1: Reps < 200ms apart
- +1: Too many perfect forms (5+ × 0.95+)
- +1: Suspicious depth drops
- -1: Decay per turn (natural)

---

## 🎮 Game Flow

```
1. Create Session (HTTP)
   POST /sessions → sessionId

2. Players Join (WebSocket)
   message: join_session

3. Start Session (HTTP)
   POST /sessions/:id/start

4. Players Submit Reps (WebSocket)
   Loop: submit_rep → validated/updated

5. Advance Turn (HTTP)
   POST /sessions/:id/advance-turn
   → Card drawn, effect applied

6. Repeat 4-5 until winner

7. End Session (HTTP)
   POST /sessions/:id/end → leaderboard
```

---

## 💾 Performance Limits

| Limit | Value | Tunable |
|-------|-------|---------|
| Max Concurrent Players | 30 | ❌ Yes |
| Max Sessions | 10 | ❌ Yes |
| Players per Session | 8 | ❌ Yes |
| Rep Time Window | 800-3000ms | ❌ Yes |
| Message Size | 4KB | ❌ Yes |
| Heartbeat Interval | 25s | ❌ Yes |
| Session Timeout | 30m | ❌ Yes |
| Live Server RAM | 250MB | ❌ Yes |
| Bot RAM | 150MB | ❌ Yes |

**Edit `live-server/config/limits.js` to tune**

---

## 🔧 Environment Variables

### Live Server
```bash
PORT=8080
NODE_ENV=production
FIREBASE_SERVICE_ACCOUNT='{...}'
DISCORD_BOT_URL=http://localhost:5000
```

### Discord Bot
```bash
DISCORD_TOKEN=your_token
DISCORD_GUILD_ID=your_guild_id
BOT_PORT=5000
NODE_ENV=production
```

---

## 📊 Monitoring Commands

```bash
# Start services
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs                    # All
pm2 logs rivalis-live       # Live server
pm2 logs rivalis-bot        # Bot

# Monitor resources
pm2 monit

# Get status
pm2 list
pm2 show rivalis-live

# Restart
pm2 restart all
pm2 restart rivalis-live

# Stop
pm2 stop all

# Delete
pm2 delete all
```

---

## 🧪 Testing

### API Test
```bash
node API_TEST.js
```

### Manual HTTP Test
```bash
# Create session
curl -X POST http://localhost:8080/sessions

# Get health
curl http://localhost:8080/health

# Bot health
curl http://localhost:5000/health
```

### WebSocket Test (using CLIENT_EXAMPLE.js)
```javascript
const client = new RivalisClient("http://localhost:8080", token);
await client.connect();
client.joinSession(sessionId, "Test Player");
client.submitRep(0.85, 0.92, 1200);
```

---

## 🚨 Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Unauthorized" | Invalid token | Verify Firebase token |
| "Not in session" | No join_session yet | Call join_session first |
| "Session not found" | Bad sessionId | Create new session |
| "Session not active" | Still waiting | POST to start endpoint |
| "Player eliminated" | 2 consecutive fails | Game rule, join next time |
| "Message too large" | > 4KB | Reduce rep data size |
| Connection refused | Server down | Start services |
| Discord channel error | Bot no permission | Check guild permissions |

---

## 📈 Scaling Considerations

### Increase Capacity
Edit `live-server/config/limits.js`:
```javascript
MAX_CONCURRENT_PLAYERS: 50,  // was 30
MAX_SESSIONS: 20,            // was 10
LIVE_SERVER_MEMORY_LIMIT_MB: 500,  // was 250
```

### Multiple Instances
Use PM2 cluster mode (requires Redis for session sharing):
```javascript
// ecosystem.config.js
{
  instances: 4,
  exec_mode: 'cluster'
}
```

---

## 🔐 Security Best Practices

✅ Always verify Firebase token before WebSocket upgrade
✅ Never expose Discord token or Firebase service account
✅ Use HTTPS/WSS in production
✅ Keep `.env` files in `.gitignore`
✅ Monitor suspicion scores for cheaters
✅ Rate limit if exposed publicly
✅ Regularly update dependencies
✅ Rotate credentials periodically

---

## 📱 Android Termux

```bash
# Setup
pkg install nodejs npm
npm install -g pm2
bash setup.sh termux

# Configuration
# Edit .env files

# Run
pm2 start ecosystem.config.js --env production

# Keep alive
termux-wake-lock

# Optional: Termux:Boot auto-start
mkdir -p ~/.termux/boot
# Create start.sh with: pm2 start ecosystem.config.js
```

---

**Reference Card v1.0** | Built for quick lookups | Complete docs in README.md
