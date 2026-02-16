# Rivalis Discord Bot Setup

## Files
- `bot.js` - Complete bot with all commands and VC management  
- `package.json` - Dependencies
- `.env` - Configuration file

## Installation

**1. Install dependencies:**
```bash
cd /workspaces/rivalis-live-engine/discord-bot
npm install
```

**2. Configure `.env`:**
```
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id
BOT_PORT=5000
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...entire json...}
```

Get values:
- **DISCORD_TOKEN**: [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Copy Token
- **DISCORD_GUILD_ID**: Discord Settings → Developer Mode ON → Right-click server → Copy Server ID
- **FIREBASE_SERVICE_ACCOUNT**: Copy from `/live-server/.env`

**3. Start bot:**
```bash
npm start
```

Should see:
```
✅ Bot logged in as YourBotName#1234
🌐 HTTP server on port 5000
```

## Commands

| Command | Usage | Example |
|---------|-------|---------|
| `!leaderboard` | View top 10 users by reps | `!leaderboard` |
| `!stats [@user]` | View stats | `!stats` or `!stats @username` |
| `!halloffame` | View recent winners | `!halloffame` |
| `!raffle` | View raffle standings | `!raffle` |
| `!help` | Show commands | `!help` |

## HTTP Endpoints

### Create Voice Channel
```bash
POST /create-vc
Body: { "sessionId": "sess-123" }
Returns: { "channelId": "...", "inviteLink": "..." }
```

### Delete Voice Channel
```bash
POST /delete-vc
Body: { "sessionId": "sess-123" }
Returns: { "success": true }
```

### Get Active Channels
```bash
GET /channels
Returns: { "activeChannels": [...], "count": 5 }
```

### Health Check
```bash
GET /health
Returns: { "status": "ok", "botReady": true, "activeChannels": 5 }
```

## Integration with Live Server

In `live-server/.env`, add:
```
DISCORD_BOT_URL=http://localhost:5000
```

When a session starts, Live Server POSTs to `/create-vc`:
```javascript
const response = await fetch('http://localhost:5000/create-vc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: 'sess-123' })
});
```

## Troubleshooting

**Bot not responding to commands?**
- Check bot has `Send Messages` + `Read Messages` permissions in Discord
- Verify DISCORD_GUILD_ID is correct
- Check bot is online in Discord

**Voice channel not creating?**
- Ensure bot has `Manage Channels` permission
- Check DISCORD_GUILD_ID is correct
- Verify bot can create channels in that server

**Firebase errors?**
- Copy entire JSON from `/live-server/.env` for `FIREBASE_SERVICE_ACCOUNT`
- Must be valid JSON in one line
