# Discord Stacking Roles System

## Overview

The Rivalis Live Discord bot features an advanced **stacking role system** that rewards consecutive winners with progressively upgraded temporary roles. Winners can stack up to **7 levels**, with each level featuring a unique name and color that intensifies with each win.

---

## How It Works

### 1. Winner Announcement
When a match ends, the winning player is announced in a designated Discord channel with:
- Winner's name and Discord mention
- Exercise performed
- Total reps completed
- Final score
- Role awarded (if applicable)

### 2. Role Stacking Progression

| Stack Level | Role Name | Color | Hex Code | Duration |
|------------|-----------|-------|----------|----------|
| 1st win | `Champion` | 🟡 Gold | `#FFD700` | 60 min |
| 2nd win | `Champion x2` | 🟠 Orange | `#FFA500` | 60 min |
| 3rd win | `Champion x3` | 🔴 Tomato | `#FF6347` | 60 min |
| 4th win | `Champion x4` | 🔴 Red | `#FF0000` | 60 min |
| 5th win | `Champion x5` | 🔴 Dark Red | `#8B0000` | 60 min |
| 6th win | `Champion x6` | 🔴 Darker | `#4B0000` | 60 min |
| 7th win | `Champion x7` | ⚫ Deepest | `#2B0000` | 60 min |

### 3. Role Mechanics

**Upgrading:**
- When a player with an existing Champion role wins again, the old role is **automatically removed**
- The new, higher-level role is **immediately granted**
- Previous stack count is retrieved from Firebase to ensure continuity

**Duration:**
- Each role lasts **60 minutes** by default (configurable via `DISCORD_PREMIUM_ROLE_DURATION_MINUTES`)
- Timer resets with each new win
- Role auto-removes when timer expires

**Maximum Stack:**
- Players can stack up to **7 wins**
- Reaching the 7th stack triggers a special "Max Streak" announcement
- Further wins while at max stack won't grant additional upgrades

### 4. Visual Indicators

Discord announcements include stack indicators:
- Stack 1: ⭐
- Stack 2: ⭐⭐
- Stack 3: ⭐⭐⭐
- Stack 4: ⭐⭐⭐⭐
- Stack 5: ⭐⭐⭐⭐⭐
- Stack 6: ⭐⭐⭐⭐⭐⭐
- Stack 7: ⭐⭐⭐⭐⭐⭐⭐

---

## Implementation

### Required Environment Variables

Add to `discord-bot/.env`:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DISCORD_WINNER_CHANNEL_ID=channel_id_for_announcements

# Role Configuration
WINNER_ROLE_NAME=Champion
DISCORD_PREMIUM_ROLE_DURATION_MINUTES=60
```

### Firebase Data Structure

Role stacks are tracked per user in Firebase:

```
users/{discordId}/stats/roleStack
{
  stackCount: 3,
  roleName: "Champion x3",
  roleId: "987654321098765432",
  lastWinAt: "2026-02-16T12:30:00.000Z",
  expiresAt: "2026-02-16T13:30:00.000Z",
  sessionId: "session-abc-123"
}
```

### API Endpoint

**POST** `/announce-winner`

Request body:
```json
{
  "sessionId": "session-123",
  "winnerDiscordId": "123456789012345678",
  "winnerName": "FitWarrior42",
  "winnerScore": 4200,
  "exerciseName": "pushups",
  "totalReps": 42,
  "guildId": "optional-guild-id"
}
```

Response:
```json
{
  "success": true,
  "sessionId": "session-123",
  "winnerName": "FitWarrior42",
  "winnerScore": 4200,
  "roleGrant": {
    "granted": true,
    "roleId": "987654321098765432",
    "roleName": "Champion x3",
    "stackCount": 3,
    "durationMinutes": 60
  },
  "announcement": {
    "sent": true,
    "channelId": "123456789012345678"
  }
}
```

---

## Testing

### Local Testing

1. Start the Discord bot:
```bash
cd discord-bot
npm install
npm start
```

2. Test first win:
```bash
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"test-1",
    "winnerDiscordId":"YOUR_DISCORD_ID",
    "winnerName":"TestWarrior",
    "winnerScore":1000,
    "exerciseName":"pushups",
    "totalReps":20
  }'
```

3. Test stack progression (run multiple times):
```bash
for i in {1..7}; do
  curl -X POST http://localhost:5000/announce-winner \
    -H "Content-Type: application/json" \
    -d "{
      \"sessionId\":\"test-$i\",
      \"winnerDiscordId\":\"YOUR_DISCORD_ID\",
      \"winnerName\":\"TestWarrior\",
      \"winnerScore\":$((1000 * $i)),
      \"exerciseName\":\"pushups\",
      \"totalReps\":$((20 * $i))
    }"
  sleep 2
done
```

### Expected Results

After running the test:
1. Check Discord announcement channel - you should see 7 winner announcements
2. Check your Discord profile - you should have "Champion x7" role
3. Role color should be deep red (`#2B0000`)
4. After 60 minutes, role should automatically disappear

---

## Integration with Hub

### When Match Ends

In your Hub's session cleanup logic:

```javascript
// After determining winner
const winner = session.players[0]; // Top scorer

// Call Discord bot
try {
  const response = await fetch(`${process.env.LIVE_ENGINE_DISCORD_BOT_URL}/announce-winner`, {
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

  const result = await response.json();
  
  if (result.success) {
    console.log(`✅ Winner announced: ${result.roleGrant.roleName}`);
  }
} catch (error) {
  console.error('Failed to announce winner:', error);
}
```

---

## Troubleshooting

### Role Not Appearing

1. **Check bot permissions:**
   - Bot needs `MANAGE_ROLES` permission
   - Bot's role must be higher than the roles it creates

2. **Verify environment variables:**
   ```bash
   echo $DISCORD_TOKEN
   echo $DISCORD_GUILD_ID
   echo $DISCORD_WINNER_CHANNEL_ID
   ```

3. **Check Firebase connection:**
   - Ensure `FIREBASE_SERVICE_ACCOUNT` is valid
   - Check Firestore rules allow write to `users/{uid}/stats/roleStack`

### Stack Count Not Persisting

1. **Check Firebase writes:**
   ```javascript
   // In bot logs, look for:
   ✅ Granted stacking role Champion x3 to username
   ```

2. **Verify Firebase document:**
   - Open Firebase Console
   - Navigate to `users/{discordId}/stats/roleStack`
   - Confirm `stackCount` is incrementing

### Role Not Expiring

1. **Check bot uptime:**
   - Bot must remain running for setTimeout to work
   - Consider using a scheduled Cloud Function for production

2. **Alternative: Scheduled cleanup:**
   ```javascript
   // Add to bot.js
   setInterval(async () => {
     const now = new Date();
     const expiredDocs = await db.collection('users')
       .where('stats.roleStack.expiresAt', '<', now.toISOString())
       .get();
     
     for (const doc of expiredDocs.docs) {
       // Remove expired roles
     }
   }, 60000); // Check every minute
   ```

---

## Future Enhancements

- [ ] Add role icons/emojis (requires server boost)
- [ ] Persist setTimeout timers to Redis for bot restarts
- [ ] Add weekly leaderboard of highest stacks reached
- [ ] Award permanent badge at stack 7
- [ ] Configurable stack colors per server
- [ ] Role glow effect (requires Discord nitro server)

---

## Support

For issues or questions:
- Check bot logs: `cd discord-bot && npm start`
- Verify with health check: `curl http://localhost:5000/health`
- Test manually: Use test commands above
