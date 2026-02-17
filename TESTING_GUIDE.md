# Testing Guide - Rivalis Live Engine

Quick reference for testing your complete backend system.

---

## 🚀 **Quick Test (Recommended)**

Run the complete automated test:

```bash
chmod +x TEST_EVERYTHING.sh
./TEST_EVERYTHING.sh
```

This will:
1. ✅ Verify environment files
2. ✅ Check dependencies
3. ✅ Start Live Server (port 8080)
4. ✅ Start Discord Bot (port 5000)
5. ✅ Test session creation
6. ✅ Test session retrieval
7. ✅ Test winner announcements
8. ✅ Test session cleanup

**Services will keep running** - Press `Ctrl+C` to stop both.

---

## 📋 **Manual Testing**

### Step 1: Start Services

**Option A - Use startup script:**
```bash
chmod +x START_ALL_SERVICES.sh
./START_ALL_SERVICES.sh
```

**Option B - Manual (separate terminals):**

Terminal 1:
```bash
cd live-server
npm start
```

Terminal 2:
```bash
cd discord-bot
npm start
```

---

### Step 2: Test Live Server

```bash
# Health check
curl http://localhost:8080/health

# Server info
curl http://localhost:8080/

# Create session
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "gameMode": "classic",
    "exerciseName": "pushups",
    "hubSessionId": "manual-test-1"
  }'
```

**Expected:** Session created with sessionId and Discord invite link

---

### Step 3: Test Discord Bot

```bash
# Health check
curl http://localhost:5000/health

# Test winner announcement (replace YOUR_DISCORD_ID)
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "manual-test-1",
    "winnerDiscordId": "YOUR_DISCORD_ID",
    "winnerName": "TestPlayer",
    "winnerScore": 1000,
    "exerciseName": "pushups",
    "totalReps": 20
  }'
```

**Expected:** Winner announced in Discord, role granted (🟥 Spark)

---

## ✅ **Success Criteria**

| Test | Expected Result |
|------|-----------------|
| Live Server starts | Port 8080 listening, health check returns "healthy" |
| Discord Bot starts | Port 5000 listening, bot online in Discord |
| Session creation | Returns sessionId + Discord invite link |
| Session retrieval | Returns session data with status/exercise |
| Winner announcement | Discord message posted, role granted |
| Session cleanup | Session ended, Discord VC deleted |

---

## 🐛 **Common Issues & Fixes**

### Live Server Won't Start

**Error:** `Cannot find module './sockets/socketHandler'`

**Fix:**
```bash
cd live-server
cp server-minimal.js server.js
cp game/sessionManager-minimal.js game/sessionManager.js
npm start
```

---

### Discord Bot Won't Start

**Error:** `Invalid token`

**Fix:**
1. Check `discord-bot/.env` has valid `DISCORD_TOKEN`
2. Regenerate token from [Discord Developer Portal](https://discord.com/developers/applications)
3. Update `.env` file
4. Restart bot

---

### Discord VC Not Creating

**Warning:** `Discord VC creation failed`

**This is OK if:**
- Discord bot isn't running (sessions still work)
- Bot lacks `MANAGE_CHANNELS` permission

**Fix:**
1. Start Discord bot
2. Check permissions in Discord server:
   - Server Settings → Roles → Your Bot Role
   - Enable: `Manage Channels`, `Manage Roles`
3. Ensure bot role is **above** Champion roles in hierarchy

---

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::8080`

**Fix:**
```bash
# Kill processes on ports 8080 and 5000
lsof -ti:8080 | xargs kill -9
lsof -ti:5000 | xargs kill -9

# Restart services
./START_ALL_SERVICES.sh
```

---

## 📊 **Test Results Checklist**

After running tests, verify:

- [ ] Live Server responds on port 8080
- [ ] Discord Bot responds on port 5000
- [ ] Health checks return 200 OK
- [ ] Can create sessions
- [ ] Discord VCs created automatically
- [ ] Winner announcements appear in Discord
- [ ] Milestone roles granted (🟥 Spark, 🩸 Rival, etc.)
- [ ] Sessions can be ended
- [ ] Discord VCs deleted on session end
- [ ] No error logs in `live-server-test.log`
- [ ] No error logs in `discord-bot-test.log`

---

## 🔍 **Debugging**

### View Live Logs

```bash
# Live Server
tail -f live-server-test.log

# Discord Bot
tail -f discord-bot-test.log

# Both simultaneously
tail -f live-server-test.log discord-bot-test.log
```

### Check Running Processes

```bash
# See all Node processes
ps aux | grep node

# Check specific ports
lsof -i :8080
lsof -i :5000
```

### Test Individual Endpoints

```bash
# All sessions
curl http://localhost:8080/sessions

# Specific session (replace SESSION_ID)
curl http://localhost:8080/sessions/SESSION_ID

# Start session
curl -X POST http://localhost:8080/sessions/SESSION_ID/start

# End session
curl -X POST http://localhost:8080/sessions/SESSION_ID/end \
  -H "Content-Type: application/json" \
  -d '{"reason":"manual_test"}'
```

---

## 🎯 **Integration Test with Hub**

To test the complete flow with your Hub:

1. **Start both services:**
   ```bash
   ./START_ALL_SERVICES.sh
   ```

2. **In Hub, create a match:**
   - Hub calls: `POST http://localhost:8080/sessions`
   - Receives: sessionId + Discord invite

3. **When match ends:**
   - Hub calls: `POST http://localhost:5000/announce-winner`
   - Hub calls: `POST http://localhost:8080/sessions/{sessionId}/end`

4. **Verify:**
   - Winner announced in Discord
   - Milestone role granted
   - Discord VC deleted
   - Session cleaned up

---

## 📚 **Related Documentation**

- [TEST_EVERYTHING.sh](TEST_EVERYTHING.sh) - Automated test script
- [START_ALL_SERVICES.sh](START_ALL_SERVICES.sh) - Start both services
- [STOP_ALL_SERVICES.sh](STOP_ALL_SERVICES.sh) - Stop both services
- [LIVE_SERVER_COMPLETE_STARTUP.md](LIVE_SERVER_COMPLETE_STARTUP.md) - Live Server guide
- [DISCORD_BOT_COMPLETE_STARTUP.md](DISCORD_BOT_COMPLETE_STARTUP.md) - Discord Bot guide

---

## 🎉 **Production Readiness**

Before deploying to production:

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Firebase credentials valid
- [ ] Discord bot permissions correct
- [ ] Hub integration tested
- [ ] Error logging configured
- [ ] Health check monitoring set up
- [ ] Backup strategy defined

---

## 🚀 **Next Steps**

Once testing is complete:

1. **Commit changes:**
   ```bash
   git add -A
   git commit -m "Backend refactor: minimal session hosting + Discord integration"
   git push origin main
   ```

2. **Deploy to production:**
   - Follow [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)
   - Or use [DEPLOYMENT.md](DEPLOYMENT.md)

3. **Monitor services:**
   - Set up health check pings
   - Configure error alerts
   - Monitor Discord bot uptime

---

**Ready to test?** Run `./TEST_EVERYTHING.sh` now! 🚀
