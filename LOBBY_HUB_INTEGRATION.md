# 🎮 Lobby Hub Integration Guide

## Overview
The **Stretching Room** lobby is now 100% functional with:
- ✅ Real-time WebSocket connections for live session updates
- ✅ Discord bot integration for automatic temp VC creation
- ✅ Functional "Create Session" buttons
- ✅ No session IDs shown (nobody cares about that!)
- ✅ Automatic player waiting room

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd live-server
npm install
```

This will install the new `axios` dependency needed for Discord bot communication.

### 2. Start the Discord Bot

The lobby needs the Discord bot running to create temp voice channels.

```bash
cd discord-bot
node bot.js
```

**Bot should start on port 5000** (default)

### 3. Start the Live Server

```bash
cd live-server
node server.js
```

**Server should start on port 8080** (default)

### 4. Access the Lobby

#### Option A: Directly from Live Server
```
http://localhost:8080/lobby-preview.html
```

#### Option B: Through Serveo Tunnel (if running)
```
http://[your-serveo-url]/lobby-preview.html
```

#### Option C: Through Vercel Hub (Recommended)

Add a proxy route in your Vercel Hub to serve the lobby:

**In your Next.js app, create: `pages/lobby.js`**

```javascript
import { useEffect } from 'react';

export default function Lobby() {
  useEffect(() => {
    // Redirect or iframe the live-server lobby
    window.location.href = process.env.NEXT_PUBLIC_LIVE_SERVER_URL + '/lobby-preview.html';
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <iframe 
        src={process.env.NEXT_PUBLIC_LIVE_SERVER_URL + '/lobby-preview.html'}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
```

**In your Vercel environment variables, add:**

```bash
NEXT_PUBLIC_LIVE_SERVER_URL=http://[your-serveo-url]
# Or for local testing:
# NEXT_PUBLIC_LIVE_SERVER_URL=http://localhost:8080
```

Now users can access the lobby at: `https://your-hub.vercel.app/lobby`

## 🔧 Environment Variables

### Live Server (.env)
```bash
PORT=8080
DISCORD_BOT_URL=http://localhost:5000
# Or if Discord bot is remote:
# DISCORD_BOT_URL=https://your-discord-bot.railway.app
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
HUB_API_SECRET=your_secret_here
HUB_API_URL=https://your-hub.vercel.app
```

### Discord Bot (.env)
```bash
BOT_PORT=5000
DISCORD_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_server_id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

## 🎯 How It Works

### User Flow
1. **User clicks "Create Session"**
   - Frontend calls `POST /sessions` with gameMode & exercise
   
2. **Live Server creates session**
   - Calls Discord bot `POST /create-vc` to create temp voice channel
   - Returns session data with Discord invite link
   
3. **Stretching Room opens**
   - Shows game mode badge
   - Displays real Discord VC link (one-click join)
   - Shows player waiting list (1/4)
   - Stretching animation while waiting
   
4. **Real-time updates via WebSocket**
   - When players join, the waiting list updates automatically
   - All lobby viewers see new sessions appear live

### WebSocket Connection
The lobby connects to: `ws://localhost:8080?type=lobby`

No authentication required for lobby viewing.

Messages received:
- `sessions_list`: Initial list of active sessions
- `session_created`: New session created
- `session_updated`: Session player count changed

## 🎮 Discord Integration

### Auto-create temp VC channels

When a session is created, the Discord bot:
1. Creates a voice channel: `Rivalis-[sessionId]`
2. Generates a 1-hour temp invite link
3. Returns the invite URL
4. Live server stores it in the session
5. Frontend displays it in the stretching room

### Cleanup

When the session ends, call:
```bash
POST http://localhost:5000/delete-vc
{
  "sessionId": "abc123"
}
```

The bot will automatically delete the voice channel.

## 📱 Accessing from iPad/Mobile

### Via Serveo (Current Setup)
Your live server is tunneled through Serveo:
```
http://a0329b4bac0e6339-104-7-145-78.serveousercontent.com/lobby-preview.html
```

The lobby is fully mobile-responsive and works on iPad!

### Via ngrok (Alternative)
```bash
ngrok http 8080
# Then access at:
# https://[random-id].ngrok.io/lobby-preview.html
```

## 🔍 Testing

### Test the lobby locally:
```bash
# Terminal 1: Start Discord bot
cd discord-bot && node bot.js

# Terminal 2: Start Live server
cd live-server && node server.js

# Terminal 3: Open browser
open http://localhost:8080/lobby-preview.html
```

### Test Discord VC creation manually:
```bash
curl -X POST http://localhost:5000/create-vc \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId": "test-123"}'
```

Should return:
```json
{
  "channelId": "1234567890",
  "channelName": "Rivalis-test-123",
  "inviteLink": "https://discord.gg/abc123xyz"
}
```

## 🐛 Troubleshooting

### Discord VC not creating
- Check Discord bot is running: `curl http://localhost:5000/health`
- Verify `DISCORD_BOT_URL` in live-server/.env
- Check bot has permissions to create channels
- Verify `DISCORD_GUILD_ID` is correct

### WebSocket not connecting
- Check browser console for errors
- Verify WebSocket URL matches your server (ws:// for http, wss:// for https)
- Test: `wscat -c "ws://localhost:8080?type=lobby"`

### Sessions not appearing
- Check live-server logs for session creation
- Test: `curl -X POST http://localhost:8080/sessions -H "Content-Type: application/json" -d '{"gameMode":"classic","exerciseName":"pushups"}'`

### Lobby showing through hub but WebSocket fails
- Update lobby URL to use hub domain
- Or proxy WebSocket through Next.js API route

## 🚀 Production Deployment

### Deploy Discord Bot to Railway
```bash
cd discord-bot
# Create railway.json (already exists)
railway up
# Add environment variables in Railway dashboard
```

### Update Live Server .env
```bash
DISCORD_BOT_URL=https://your-discord-bot.railway.app
```

### Deploy Live Server to Railway/Heroku
```bash
cd live-server
railway up
# Or: git push heroku main
```

### Update Vercel Hub
```bash
# Add to Vercel environment variables:
NEXT_PUBLIC_LIVE_SERVER_URL=https://your-live-server.railway.app
```

## 📊 Current Status

✅ **Completed:**
- Session creation with Discord VC integration
- WebSocket lobby viewer (no auth required)
- Real-time session updates
- Stretching room modal with Discord link
- Mobile-responsive design (red/black theme)
- All 5 game modes functional

⏳ **Todo (optional enhancements):**
- Real player avatars from Firebase
- Voice chat indicator (who's talking)
- Session invite links (share with friends)
- Countdown timer before match starts
- Player ready/not-ready status

## 🎉 Now 100% Functional!

You can now:
1. ✅ Click "Create Session" → stretching room opens
2. ✅ See real Discord VC link → click to join voice
3. ✅ Watch player list update in real-time
4. ✅ Access from iPad through Serveo URL
5. ✅ Share lobby link with friends

**Access now at:**
```
http://a0329b4bac0e6339-104-7-145-78.serveousercontent.com/lobby-preview.html
```

Or through your Vercel Hub at:
```
https://your-hub.vercel.app/lobby
```
