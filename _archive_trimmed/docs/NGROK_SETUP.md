# Ngrok Setup for Remote Player Connections

Expose your Termux Live Server to the internet so remote players can connect.

## Step 1: Create Free Ngrok Account

1. Go to https://ngrok.com/
2. Sign up (free)
3. Go to Dashboard → Auth Token
4. Copy your auth token (looks like: `2oX...` - keep it secret!)

## Step 2: Install Ngrok on Termux

Run on Termux device:

```bash
npm install -g ngrok
```

Or if that doesn't work:

```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
```

## Step 3: Add Auth Token

Run on Termux:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

Replace `YOUR_AUTH_TOKEN_HERE` with the token from Step 1.

## Step 4: Start Ngrok Tunnel

Run on Termux:

```bash
ngrok http 8080
```

You'll see output like:

```
ngrok                                                    (Ctrl+C to quit)

Session Status                online
Account                       your-email@gmail.com
Version                       3.x.x
Region                        us (United States)
Forwarding                    https://abc-123-def.ngrok.io -> http://localhost:8080
...
```

**Copy the `https://abc-123-def.ngrok.io` URL** - this is your public URL!

## Step 5: Update Environment Variables

On Termux, in `live-server/.env`:

```bash
# OLD (local only)
# HUB_API_URL=http://localhost:8080

# NEW (remote access)
LIVE_SERVER_URL=https://abc-123-def.ngrok.io
HUB_API_URL=https://your-hub-project.vercel.app
HUB_API_SECRET=a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5
```

## Step 6: Test Remote Connection

From any device (phone, computer, anywhere):

```
https://abc-123-def.ngrok.io/lobby-preview.html
```

Should load the lobby!

## ⚠️ Important Notes

**URL Changes Every Restart:**
- Each time you restart Ngrok, you get a NEW URL
- Update the URL in your Hub settings when this happens
- For testing: OK (free tier)
- For production: Need Ngrok paid ($5/mo for static URL)

**Keep Terminal Running:**
- Don't close the terminal where Ngrok is running
- It must stay open for the tunnel to work

**Firewall:**
- Make sure your Termux device's firewall allows outbound HTTPS connections
- Ngrok handles the tunneling, so it should work

## Next: Update Hub Configuration

Once you have the Ngrok URL working, update your Hub `/api/live-engine/reps/completed` calls to use:

```javascript
const LIVE_SERVER_URL = process.env.LIVE_SERVER_URL || 'https://abc-123-def.ngrok.io';

fetch(`${LIVE_SERVER_URL}/api/sessions`, ...)
```

## Troubleshooting

**"ngrok command not found"**
- Install again: `npm install -g ngrok` or `apt install ngrok`

**"Cannot connect to tunnel"**
- Check your auth token is correct
- Make sure Live Server is running on port 8080
- Restart Ngrok

**"Connected but pages don't load"**
- Make sure Live Server (`npm start` in `/live-server`) is running
- Check server logs for errors

**URL changes unexpectedly**
- Free tier URL is temporary, lasts ~8 hours or until disconnect
- Upgrade to paid ($5/mo) for permanent URL
