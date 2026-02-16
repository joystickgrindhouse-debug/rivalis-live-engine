# 🤖 Bot System Documentation - Rivalis Live

## Overview

The Rivalis Live bot system automatically fills multiplayer sessions with AI players when there aren't enough real players, preventing long matchmaking waits and ensuring games start promptly.

---

## ⚙️ Configuration

Bot behavior is configured in `live-server/config/limits.js`:

```javascript
// Bot configuration
BOT_ENABLED: true,              // Enable/disable bot players
BOT_ADD_TIMEOUT_MS: 30000,      // Add bots after 30s wait (if 1+ real players)
BOT_ADD_COUNT: 2,               // Add up to 2 bots per session
BOT_MIN_ACTIVE: 2,              // Maintain min bots during active game
BOT_DIFFICULTY: 'normal',       // 'easy', 'normal', 'hard'
```

---

## 🤖 Bot Features

### Automatic Bot Addition

Bots are automatically added to a session when:

1. **Waiting Phase Timeout**
   - At least 1 real player has joined
   - Session waiting for >30 seconds
   - Adds up to 2 bots to expedite game start

2. **Before Game Start**
   - Not enough players to meet MIN_PLAYERS requirement
   - Bots added to fill to minimum before starting
   - Can be overridden with manual start

3. **During Active Game**
   - Maintains minimum active players if someone quits
   - Adds 1 bot if needed

### Bot Characteristics

Each bot:
- ✅ Has a realistic name (BotAlpha, Crusher, Phoenix, etc.)
- ✅ Marked with `isBot: true` flag
- ✅ Generates realistic rep submissions
- ✅ Passes all anti-cheat validation
- ✅ Follows all game rules
- ✅ Can be eliminated like real players

### Realistic Rep Submission

Bot reps are generated with:

- **Depth**: 0.6-0.9 range (realistic form depth)
- **Form Score**: 0.7-0.95 range (realistic quality)
- **Rep Time**: 800-3000ms per rep
- **Success Rate**: 70-95% vary by configuration
- **Reaction Time**: 3-7 seconds (simulated thinking)

### Difficulty Levels

```javascript
BOT_DIFFICULTY: 'normal'  // Config setting

// Success rates by difficulty:
// 'easy'   → 50-70% success rate
// 'normal' → 70-95% success rate  
// 'hard'   → 85-99% success rate
```

---

## 🎮 Bot Behavior During Gameplay

### Turn Execution

When it's a bot's turn:
1. Bot reaction time elapses (3-7s)
2. Bot generates realistic rep payload
3. Rep submitted through standard validation pipeline
4. Card effects applied same as real players
5. Scoring calculated normally

### Elimination

Bots follow same elimination rules:
- ✅ Fail 2 consecutive reps → eliminated
- ✅ Become spectators after elimination
- ✅ No longer submit reps
- ✅ Can cause game end if only 1 player left

### On Disconnect

If real players drop and only bots remain:
- Game continues with bots
- New session available for real players
- Session ends when 1 bot left (game over)

---

## 📊 Bot Statistics

### Memory Impact

- **Per Bot**: ~1KB of state data
- **Example**: 3 bots = ~3KB additional
- **Negligible** impact compared to real player management

### Performance

- **Bot Reaction**: 3-7 second delay (configurable)
- **Validation**: Same as real players (<5ms)
- **No Background Processing**: Bots only act on their turn

---

## 🔧 API & Integration

### Creating Bots

Bots are created automatically by the session manager:

```javascript
// In sessionManager.js - automatically called during startSession()
const botsNeeded = LIMITS.MIN_PLAYERS - realPlayerCount;
const addedBots = botEngine.addBotsToSession(session, botsNeeded);
```

### Bot Rep Submission

Bots submit reps through the standard pipeline:

```javascript
// Bots use same validation as real players
const result = submitRep(sessionId, botId, repPayload);
// Returns same format: { valid, repData, error }
```

### Identifying Bots

Check if player is a bot:

```javascript
const player = session.players[playerId];
if (player.isBot) {
  console.log('This is a bot');
  console.log('Bot name:', player.name);
  console.log('Bot ID:', player.id);
}
```

---

## 🎯 Usage Scenarios

### Scenario 1: Solo Player Joins Empty Session

```
T=0s:   Player joins → 1 real player
T=30s:  Timeout reached → Add 2 bots
T=32s:  Start game with 3 players (1 real, 2 bots)
T=45s:  2nd real player joins (too late, game started)
```

### Scenario 2: Immediate Start (Enough Players)

```
T=0s:   Player 1 joins → 1 real player
T=2s:   Player 2 joins → 2 real players (≥ MIN_PLAYERS)
T=5s:   POST /start → Game starts with 2 players (no bots needed)
```

### Scenario 3: Real Players + Bots

```
T=0s:   Player 1 joins → 1 real player
T=30s:  Timeout → Add 2 bots (now 3 players)
T=35s:  Player 2 joins (session already active)
T=45s:  Session has 2 real players, 2 bots
T=80s:  Player 1 loses both turns → Eliminated
T=100s: Game continues: 1 real player vs 2 bots
T=150s: Last real player wins against bots
```

---

## 📈 Configuration Examples

### Conservative (Few Bots)

```javascript
BOT_ENABLED: true,
BOT_ADD_TIMEOUT_MS: 60000,  // Wait 60s before adding
BOT_ADD_COUNT: 1,           // Only add 1 bot
BOT_MIN_ACTIVE: 1,          // Minimum 1 bot
BOT_DIFFICULTY: 'easy',     // Easy bots (50-70% success)
```

### Aggressive (Many Bots)

```javascript
BOT_ENABLED: true,
BOT_ADD_TIMEOUT_MS: 10000,  // Add after 10s
BOT_ADD_COUNT: 4,           // Can add 4 bots
BOT_MIN_ACTIVE: 3,          // Keep 3 active
BOT_DIFFICULTY: 'hard',     // Hard bots (85-99% success)
```

### No Bots

```javascript
BOT_ENABLED: false,  // Disable completely
// Requires MIN_PLAYERS real players to start
```

---

## 🐛 Troubleshooting

### Bots Not Being Added

**Check:**
1. `BOT_ENABLED` is `true` in limits.js
2. Session is in `waiting` state
3. Timeout has elapsed (default 30s)
4. At least 1 real player joined

### Too Many/Few Bots

**Adjust:**
```javascript
BOT_ADD_COUNT: 2,        // Change how many to add
BOT_MIN_ACTIVE: 2,       // Change minimum maintained
```

### Bots Too Good/Bad

**Adjust:**
```javascript
BOT_DIFFICULTY: 'normal',  // 'easy', 'normal', 'hard'
// Or modify botConfig in botEngine.js
```

### Bots Not Submitting Reps

**Check:**
1. Session is `active` (not `waiting` or `finished`)
2. Bot is not `eliminated`
3. Check logs for bot submission messages
4. Verify anti-cheat isn't rejecting bot reps

---

## 🎓 Bot Implementation Details

The bot system is composed of:

| File | Purpose |
|------|---------|
| [game/botEngine.js](live-server/game/botEngine.js) | Bot creation, rep generation, turn execution |
| [config/limits.js](live-server/config/limits.js) | Bot configuration parameters |
| [game/sessionManager.js](live-server/game/sessionManager.js) | Bot integration with session lifecycle |

### botEngine.js Functions

```javascript
createBotPlayer(index)           // Create single bot
generateBotRep(botConfig)        // Generate realistic rep
calculateBotsNeeded(session)     // Check if bots needed
addBotsToSession(session, count) // Add bots to session
executeBotTurnAsync(bot)         // Execute bot turn
```

---

## 💡 Best Practices

✅ **Enable bots** for public multiplayer to prevent wait times
✅ **Set realistic difficulty** matching your intended skill level
✅ **Monitor bot count** - don't let bots dominate (keep ratio 1:1 or better)
✅ **Test bot rep patterns** - ensure they don't trigger anti-cheat
✅ **Provide feedback** - let real players know they're playing bots

---

## 📝 Notes

- Bots are session-specific (not persistent across sessions)
- Bots can't chat or use Discord (no socket connections)
- Bots always follow game rules (can't cheat)
- Bots calculate scores identically to real players
- Bot vs Bot games work fine (all bots can play)
- Leaderboard includes bot scores

---

**Bot System Ready** ✅ | Automatic matchmaking enhancement | Zero configuration needed to run
