# Quick Reference - Start Both Services

One-command startup for both Live Server (8080) and Discord Bot (5000).

---

## ⚡ Fastest Start

```bash
chmod +x START_ALL_SERVICES.sh
./START_ALL_SERVICES.sh
```

Expected output:
```
🚀 Starting Rivalis Backend Services...
📡 Starting Live Server (Port 8080)...
   ✅ Live Server started (PID: 12345)
🤖 Starting Discord Bot (Port 5000)...
   ✅ Discord Bot started (PID: 12346)
🧪 Testing services...
✅ Live Server:   http://localhost:8080 - HEALTHY
✅ Discord Bot:   http://localhost:5000 - HEALTHY

🎮 RIVALIS BACKEND SERVICES RUNNING
```

---

## 🛑 Stop Both Services

```bash
chmod +x STOP_ALL_SERVICES.sh
./STOP_ALL_SERVICES.sh
```

---

## 📋 Manual Start (Separate Terminals)

### Terminal 1: Live Server
```bash
cd live-server
npm start
```

### Terminal 2: Discord Bot
```bash
cd discord-bot
npm start
```

---

## 🧪 Test Both Services

```bash
# Test Live Server
curl http://localhost:8080/health

# Test Discord Bot
curl http://localhost:5000/health

# Create session (tests both - Live creates session, Discord creates VC)
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{"gameMode":"classic","exerciseName":"pushups"}'
```

---

## 📋 View Logs

```bash
# Live Server logs
tail -f live-server.log

# Discord Bot logs
tail -f discord-bot.log

# Both simultaneously
tail -f live-server.log discord-bot.log
```

---

## 🚀 Ports

| Service | Port | URL |
|---------|------|-----|
| Live Server | 8080 | http://localhost:8080 |
| Discord Bot | 5000 | http://localhost:5000 |

---

## 📚 Complete Documentation

**Discord Bot:**
- [DISCORD_BOT_COMPLETE_STARTUP.md](DISCORD_BOT_COMPLETE_STARTUP.md) - Full Discord bot guide

**Live Server:**
- [LIVE_SERVER_COMPLETE_STARTUP.md](LIVE_SERVER_COMPLETE_STARTUP.md) - Full live server guide

**System:**
- [BACKEND_ONLY_SETUP.md](BACKEND_ONLY_SETUP.md) - Complete backend architecture
- [DISCORD_STACKING_ROLES_SYSTEM.md](DISCORD_STACKING_ROLES_SYSTEM.md) - Role system details

---

## ✅ Success Indicators

Both services running correctly when you see:

**Live Server:**
```
🎮 ===== RIVALIS LIVE - SESSION HOST =====
🚀 Server running on port 8080
📝 Role: Session lifecycle management
```

**Discord Bot:**
```
✅ Discord bot ready! Logged in as RivalisBot#1234
🌐 HTTP server listening on port 5000
```

---

## 🔄 Common Commands

```bash
# Start both
./START_ALL_SERVICES.sh

# Stop both
./STOP_ALL_SERVICES.sh

# Restart both
./STOP_ALL_SERVICES.sh && ./START_ALL_SERVICES.sh

# Check if running
ps aux | grep "node.*server.js"
ps aux | grep "node.*bot.js"

# Check ports
lsof -i :8080  # Live Server
lsof -i :5000  # Discord Bot
```

---

Ready to go! 🚀
