# Discord Winner Announcements - Quick Start

Copy/paste ready commands to enable Discord winner announcements with stacking roles in your Rivalis Live setup.

---

## ✅ Setup (5 minutes)

### 1. Set Environment Variables

Add to `discord-bot/.env`:

```bash
DISCORD_WINNER_CHANNEL_ID=paste_your_channel_id_here
DISCORD_PREMIUM_ROLE_DURATION_MINUTES=60
WINNER_ROLE_NAME=Champion
```

**To get your channel ID:**
1. Enable Discord Developer Mode: Settings → Advanced → Developer Mode
2. Right-click your announcements channel → Copy ID
3. Paste the ID in `.env` file

### 2. Restart Discord Bot

```bash
cd discord-bot
npm start
```

You should see:
```
✅ Discord bot ready! Logged in as YourBotName#1234
🌐 HTTP server listening on port 5000
```

---

## ✅ Test It (2 minutes)

### Quick Test

Replace `YOUR_DISCORD_ID` with your Discord user ID:

```bash
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"quick-test-1",
    "winnerDiscordId":"YOUR_DISCORD_ID",
    "winnerName":"TestPlayer",
    "winnerScore":1000,
    "exerciseName":"pushups",
    "totalReps":20
  }'
```

**Expected:**
- ✅ Winner announcement appears in your Discord channel
- ✅ You receive the "Champion" role (gold color)
- ✅ Role will auto-remove after 60 minutes

### Test Stack Progression

Run this multiple times to see roles upgrade:

```bash
# 1st win - Champion
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-1","winnerDiscordId":"YOUR_DISCORD_ID","winnerName":"StackTest","winnerScore":1000,"exerciseName":"pushups","totalReps":20}'

# Wait 2 seconds, then 2nd win - Champion x2
sleep 2
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-2","winnerDiscordId":"YOUR_DISCORD_ID","winnerName":"StackTest","winnerScore":1500,"exerciseName":"squats","totalReps":25}'

# Wait 2 seconds, then 3rd win - Champion x3
sleep 2
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-3","winnerDiscordId":"YOUR_DISCORD_ID","winnerName":"StackTest","winnerScore":2000,"exerciseName":"burpees","totalReps":30}'
```

---

## ✅ Integrate with Hub (3 minutes)

### Option A: Call from Hub Session End

Add to your Hub's session cleanup:

```javascript
// When match ends
const winner = leaderboard[0]; // Top player

await fetch(`${process.env.LIVE_ENGINE_DISCORD_BOT_URL}/announce-winner`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.id,
    winnerDiscordId: winner.discordId,
    winnerName: winner.username,
    winnerScore: winner.finalScore,
    exerciseName: session.exercise,
    totalReps: winner.totalReps,
  }),
});
```

### Option B: Call from Live-Server

Add to `live-server` session end handler:

```javascript
// In your session end logic
if (winner && winner.discordId) {
  const botUrl = process.env.DISCORD_BOT_URL || 'http://localhost:5000';
  
  try {
    await fetch(`${botUrl}/announce-winner`, {
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
  } catch (error) {
    console.warn('Failed to announce winner to Discord:', error.message);
  }
}
```

---

## 🎯 What You Get

### Winner Announcements
Rich Discord embeds showing:
- 🏆 Winner's name
- 💪 Exercise performed
- 📊 Total reps
- 🎯 Final score
- 👑 Role awarded

### Stacking Roles
- **Stack 1:** Champion (Gold)
- **Stack 2:** Champion x2 (Orange)
- **Stack 3:** Champion x3 (Red)
- **Stack 4-7:** Progressive darker reds
- **Max stack:** 7 wins

### Auto-Expiration
- Roles automatically remove after 60 minutes
- Timer resets with each new win
- Stack count persists in Firebase

---

## 🔧 Customization

### Change Role Name

```env
WINNER_ROLE_NAME=Fitness Legend
```

Results in: "Fitness Legend", "Fitness Legend x2", etc.

### Change Duration

```env
DISCORD_PREMIUM_ROLE_DURATION_MINUTES=120
```

Roles now last 2 hours instead of 1 hour.

### Use Different Channel

```env
DISCORD_WINNER_CHANNEL_ID=different_channel_id
```

Announcements go to the new channel.

---

## 🐛 Troubleshooting

### Bot Not Announcing

1. Check bot is running:
   ```bash
   curl http://localhost:5000/health
   ```

2. Check channel ID is correct:
   ```bash
   echo $DISCORD_WINNER_CHANNEL_ID
   ```

3. Check bot logs:
   ```bash
   cd discord-bot && npm start
   # Look for: 📢 Winner announcement sent to channel
   ```

### Role Not Granted

1. **Bot needs permissions:**
   - Go to Discord Server Settings → Roles
   - Drag bot's role **above** the roles it creates
   - Ensure bot has "Manage Roles" permission

2. **Check user ID is correct:**
   - Right-click your profile in Discord → Copy ID
   - Paste in test command

3. **Verify Firebase:**
   ```bash
   # Check if FIREBASE_SERVICE_ACCOUNT is set
   echo $FIREBASE_SERVICE_ACCOUNT | jq .project_id
   ```

### Stack Not Incrementing

1. **Check Firebase writes:**
   - Open Firebase Console
   - Go to `users/{discordId}/stats/roleStack`
   - Confirm `stackCount` is updating

2. **Verify bot logs:**
   ```
   ✅ Granted stacking role Champion x3 to username
   ```

---

## 📚 Full Documentation

For complete details, see:
- [DISCORD_STACKING_ROLES_SYSTEM.md](DISCORD_STACKING_ROLES_SYSTEM.md) - Full system reference
- [BACKEND_ONLY_SETUP.md](BACKEND_ONLY_SETUP.md) - Complete backend setup guide

---

## 🎉 You're Done!

Your Discord bot now:
- ✅ Announces all match winners
- ✅ Grants stacking roles (up to 7x)
- ✅ Auto-removes expired roles
- ✅ Tracks progress in Firebase
- ✅ Shows beautiful embeds

Test it by running a match and winning! 🏆
