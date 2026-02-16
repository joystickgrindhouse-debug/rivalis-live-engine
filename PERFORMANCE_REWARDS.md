# Performance Rewards System

## Overview
The Discord bot now tracks and awards performance-based rewards:
- **XP**: Based on reps + score performance + placement bonus
- **Raffle Tickets**: Based on placement and reps
- **Winner Role**: Automatically assigned to 1st place winners
- **Rewards History**: Saved in Firebase and displayed in Rivalis Hub

## XP Calculation
```javascript
XP = (reps × 1) + (score × 0.5) + placement_bonus
```

**Placement Bonuses:**
- 1st place: +100 XP
- 2nd place: +50 XP
- 3rd place: +25 XP
- Others: +10 XP

## Raffle Tickets Calculation
```javascript
Base Tickets = {1: 5, 2: 3, 3: 2, others: 1}
Bonus = Math.floor(reps / 10)
Total = Base Tickets + Bonus
```

**Examples:**
- 1st place + 50 reps = 5 + 5 = **10 tickets**
- 2nd place + 30 reps = 3 + 3 = **6 tickets**
- 3rd place + 20 reps = 2 + 2 = **4 tickets**

## Integration with Live Engine

**When session ends, POST to Discord bot:**

```bash
curl -X POST http://localhost:5000/award-performance \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "discordId": "987654321",
    "placement": 1,
    "repsAdded": 50,
    "scoreAdded": 1000,
    "sessionId": "session-abc123"
  }'
```

**Live Server implementation:**

Add this to `/live-server/routes.js` or your session end handler:

```javascript
async function awardSessionRewards(finalLeaderboard) {
  const DISCORD_BOT_URL = process.env.DISCORD_BOT_URL || 'http://localhost:5000';
  
  for (const entry of finalLeaderboard) {
    if (!entry.userId || !entry.discordId) continue;
    
    try {
      const response = await fetch(`${DISCORD_BOT_URL}/award-performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: entry.userId,
          discordId: entry.discordId,
          placement: entry.placement,
          repsAdded: entry.repsAdded,
          scoreAdded: entry.finalScore,
          sessionId: entry.sessionId,
        }),
      });
      
      const result = await response.json();
      console.log(`[Rewards] ${entry.userId}: ${result.xpAwarded} XP, ${result.raffleTickets} tickets`);
    } catch (error) {
      console.error(`[Rewards] Failed to award to ${entry.userId}:`, error.message);
    }
  }
}
```

## Firebase Structure

**User Stats with Rewards:**
```
users/{userId}/stats/overview
├── xp: 5200
├── totalRaffleTickets: 145
├── lastRewardAt: "2026-02-16T12:00:00Z"
└── ... (other stats)
```

**Reward History:**
```
users/{userId}/rewards/{sessionId}
├── sessionId: "session-abc123"
├── xpAwarded: 180
├── raffleTickets: 10
├── placement: 1
├── repsAdded: 50
├── scoreAdded: 1000
└── awardedAt: "2026-02-16T12:00:00Z"
```

## Discord Features

### DM Notification
When rewards are granted, user receives:
- 🥇 Placement badge
- ⭐ XP earned
- 🎟️ Raffle tickets
- 📊 Performance metrics

### Winner Role
- Automatically created as "Champion" (gold color #FFD700)
- Assigned to 1st place winners
- Persistent across sessions

### Viewing Rewards
Users can see rewards in Discord bot commands:
- `!stats` - Shows total XP and raffle tickets
- `!raffle` - Shows raffle ticket leaderboard
- `!leaderboard` - Shows XP leaderboard

## Hub Integration

**Display XP in Rivalis Hub:**
Add to user profile dashboard:
```javascript
const userStats = await db.collection('users').doc(userId).collection('stats').doc('overview').get();
const { xp, totalRaffleTickets } = userStats.data();

// Display:
// ⭐ XP: 5,200
// 🎟️ Raffle Tickets: 145
```

**Leaderboard options:**
1. `!xp-leaderboard` - Top 10 by XP
2. `!raffle-leaderboard` - Top 10 by tickets
3. Hub profile page shows personal XP trend graph

## Testing

**Test endpoint:**
```bash
curl -X POST http://localhost:5000/award-performance \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-1",
    "discordId": "207938282",
    "placement": 1,
    "repsAdded": 50,
    "scoreAdded": 1000,
    "sessionId": "test-session-1"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "userId": "test-user-1",
  "xpAwarded": 180,
  "raffleTickets": 10,
  "placement": 1,
  "message": "Rewards granted: +180 XP, +10 raffle tickets"
}
```

## Commands to Add (Optional)

```javascript
// !xp-leaderboard - Top 10 XP users
// !tickets-leaderboard - Top 10 raffle ticket holders
// !my-rewards - Personal reward history
// !stats - Enhanced to show XP + tickets
```

## Configuration

**Set in Discord Bot .env:**
```
WINNER_ROLE_NAME=Champion    # Role name for winners (default: "Champion")
```

## Notes
- XP and raffle tickets persist across sessions
- Winner role remains unless manually removed
- Rewards are awarded immediately when session ends
- Discord DM is optional (user can disable)
- Live Engine must pass `discordId` with user data
