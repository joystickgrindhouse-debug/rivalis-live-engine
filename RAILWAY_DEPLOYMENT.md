# Rivalis Live Server - Railway Deployment Guide

## Deploy in 5 Minutes

### Step 1: Create Railway Account
Go to https://railway.app and sign up (free)

### Step 2: Connect GitHub
- Click "Create New Project"
- Select "Deploy from GitHub"
- Authorize and select: `rivalis-live-engine`

### Step 3: Configure
Railway auto-detects Node.js. Just click "Deploy"

### Step 4: Get Your URL
After deploy completes:
- Go to your Railway project
- Click "Settings"
- Copy your domain: `your-app.railway.app`

### Step 5: Update Your Hub PWA

In your Vercel Hub, update the server URL:

```javascript
// In your Hub client (wherever you initialize RivalisLiveClient):
const liveClient = new RivalisLiveClient({
  serverUrl: 'wss://your-app.railway.app',  // Use wss:// for secure
  userId: localStorage.getItem('userId'),
  firebaseToken: localStorage.getItem('firebaseToken'),
});
```

That's it! ✅

---

## Environment Variables

Railway needs these variables (optional, but recommended):

```
FIREBASE_API_KEY=your-firebase-key
DISCORD_TOKEN=your-discord-token
NODE_ENV=production
```

Set them in Railway Settings → Variables

---

## What Gets Deployed

Everything from `/live-server/`:
- ✅ Game engine (sessionManager, repEngine, etc)
- ✅ WebSocket server on port 8080
- ✅ Exercise reference data (16 JSONs)
- ✅ Anti-cheat system
- ✅ Card system
- ✅ Bot system

---

## Monitor Your Server

In Railway dashboard:
- "Logs" tab: See real-time requests
- "Metrics" tab: CPU, memory, uptime
- "Health Checks" tab: Verify it's running

---

## Troubleshooting

**Hub can't connect:**
- Check WebSocket URL is correct: `wss://your-app.railway.app`
- Open browser DevTools → Console (look for connection messages)
- Verify Railway deployment completed (check Logs)

**Server crashes:**
- Check Railway logs for error messages
- Make sure all 16 exercise JSONs are included
- Verify `live-server/package.json` has all dependencies

**Connection timeout:**
- Make sure you're using `wss://` (secure WebSocket)
- Allow 30 seconds for Railway to respond on first request

---

## Cost

- **Free tier**: Yes, includes free dyno hours
- **Upgrade when needed**: $5-10/month for production
- Much cheaper than keeping dedicated server running

---

## Next Steps

1. Go to https://railway.app
2. Sign up
3. Connect your GitHub repo
4. Deploy
5. Copy the generated URL
6. Update your Hub PWA client with that URL
7. Test!

Done! 🚀
