# Rivalis Live Server - Android Termux Deployment

## Complete Guide for Running Live Server on Your Phone

### Prerequisites
- Android device with Termux installed
- WiFi connection (for network access)
- ~300MB free storage

---

## Installation Steps

### Step 1: Install Node.js in Termux

```bash
# Open Termux and run:
pkg update
pkg upgrade
pkg install nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Clone/Setup Live Server

**Option A: Clone from GitHub**
```bash
cd ~
git clone https://github.com/joystickgrindhouse-debug/rivalis-live-engine.git
cd rivalis-live-engine/live-server
```

**Option B: Copy files directly**
- Transfer the `live-server/` folder to your Termux device
- Place in: `~/rivalis-live-engine/live-server/`

### Step 3: Install Dependencies

```bash
cd ~/rivalis-live-engine/live-server
npm install
```

This installs: `express`, `ws`, `firebase-admin`, `uuid`, `dotenv`

### Step 4: Copy Exercise Reference Files

```bash
# From live-server directory, copy 16 exercise JSONs
cp ../*.json .

# Verify they're there
ls *.json | wc -l  # Should show 16
```

### Step 5: Create .env File

```bash
# Create environment file
cat > .env << 'EOF'
NODE_ENV=production
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-email
PORT=8080
EOF
```

**Optional:** Leave blank if not using Firebase (for testing)

### Step 6: Start the Server

```bash
# Start Live Server
npm start

# Or with explicit node (if npm has issues)
node server.js
```

You should see:
```
[LiveServer] Listening on port 8080
[Exercises] Initialized 16/16 exercises
[LiveServer] Ready for connections
```

---

## Get Your Network Address

**In a NEW Termux tab** (keep server running):

```bash
# Get your local IP address
ifconfig

# Look for wlan0 section, find: inet 192.168.x.x

# Or simpler:
hostname -I
```

**Example output:** `192.168.1.100` or `10.0.0.50`

**Your WebSocket URL:** `ws://YOUR_IP:8080`

---

## Connect Your Hub PWA

### In Your Vercel Hub Code

Find where you initialize the Live Client and set:

```javascript
// For testing (same WiFi network)
const serverUrl = 'ws://192.168.1.100:8080';

// OR from environment variable
const serverUrl = process.env.REACT_APP_LIVE_SERVER_URL || 'ws://localhost:8080';
```

**Update in your Hub's `.env` file:**
```
REACT_APP_LIVE_SERVER_URL=ws://192.168.1.100:8080
```

Then restart your Hub server.

---

## Testing Connection

### From Hub (on same WiFi):

```javascript
const client = new RivalisLiveClient({
  serverUrl: 'ws://192.168.1.100:8080',
  userId: 'test-user',
  firebaseToken: 'test-token'
});

await client.connect();
console.log('Connected:', client.connected);
```

If you see `true`, it works! ✅

---

## Keep Server Running

### Option 1: Keep Termux Open
- Leave Termux running in background
- Server stays live as long as Termux is active

### Option 2: Use a Terminal Multiplexer (tmux)
```bash
# Install tmux
pkg install tmux

# Create session
tmux new-session -d -s live-server

# Attach and start server
tmux send -t live-server "cd ~/rivalis-live-engine/live-server && npm start" Enter

# Detach: Ctrl+B, D

# Re-attach later
tmux attach -t live-server
```

### Option 3: Use PM2
```bash
# Install PM2
npm install -g pm2

# Start server with PM2
pm2 start server.js --name "live-server"

# Make it restart on reboot
pm2 startup
pm2 save
```

---

## Monitor Server

### View Logs

```bash
# Live logs
tail -f ~/.pm2/logs/live-server-out.log

# All connections
grep "connect" ~/.pm2/logs/live-server-out.log
```

### Check Memory Usage

```bash
free -h          # Overall memory
top -b -n 1      # Process usage (find node process)
```

**Expected:** 50-100MB for Live Server

### Check if Running

```bash
lsof -i :8080    # Is port 8080 in use?
netstat -tulpn | grep 8080
```

---

## Troubleshooting

### "npm: command not found"
```bash
pkg install nodejs-lts
```

### "Port 8080 already in use"
```bash
# Kill existing process
lsof -i :8080 | awk 'NR!=1 {print $2}' | xargs kill -9

# Or use different port (edit server.js)
```

### "Connection refused" from Hub
- Verify server is running: `lsof -i :8080`
- Check IP address: `hostname -I`
- Ping from Hub device: `ping 192.168.1.100`
- Wrong IP? Update in Hub `.env`

### "WebSocket connection failed"
- Make sure both on same WiFi
- Check firewall isn't blocking port 8080
- Try: `nc -zv 192.168.1.100 8080`

### Server crashes on start
```bash
# Check for errors
npm start 2>&1 | head -20

# Check Node version
node --version  # Need v18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Internet Access (Optional)

### To access from outside your WiFi:

**Option 1: Localhost Tunnel (Free)**
```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok tcp 8080

# Get URL like: tcp://n-west-123.ngrok.io:12345
```

**Option 2: Port Forward**
- Set up port forwarding on your router
- Map `external:8080` → `device-ip:8080`
- Use: `ws://your-public-ip:8080`

**Option 3: Cloud Proxy**
Use a service like:
- Serveo: `ssh -R 80:localhost:8080 serveo.net`
- ngrok
- CloudFlare Tunnel

---

## Performance Tuning

### Increase Memory (if crashing)
```bash
# Start with more memory
node --max-old-space-size=500 server.js
```

### Monitor in Real-Time
```bash
# Watch memory/CPU usage
watch -n 1 'ps aux | grep node'
```

### Disable unused features
In `limits.js`:

```javascript
BOT_ENABLED: false,        // Disable bots to save memory
MAX_CONCURRENT_PLAYERS: 20, // Reduce if needed
MAX_SESSIONS: 5,
```

---

## Production Checklist

- ✅ Node.js installed
- ✅ Dependencies installed
- ✅ Exercise JSONs copied
- ✅ .env file created
- ✅ Server starts without errors
- ✅ IP address known
- ✅ Hub connected successfully
- ✅ Test multiplayer session works
- ✅ Server keeps running (tmux/PM2)

---

## Next Steps

1. **Start server on Termux**
2. **Get your IP address**
3. **Update your Hub with IP:8080**
4. **Test connection from Hub**
5. **Play multiplayer!** 🎮

---

## Support

Having issues? Check:
- Live Server logs: `tail -f server.log`
- Node version: `node --version`
- Port in use: `lsof -i :8080`
- Network: `ping 192.168.1.100` from Hub device

---

## Architecture

```
┌─────────────────────────────────────┐
│  Your Android Device (Termux)       │
│  ┌──────────────────────────────┐   │
│  │  Live Server (Node.js)       │   │
│  │  ├─ WebSocket :8080          │   │
│  │  ├─ Game Engine              │   │
│  │  ├─ Rep Validation           │   │
│  │  └─ Leaderboard              │   │
│  └──────────────────────────────┘   │
└──────────────────┬──────────────────┘
                   │ WiFi/Internet
                   ↓ (WebSocket)
         ┌─────────────────────┐
         │  Hub PWA (Vercel)   │
         │  Browser/Android    │
         └─────────────────────┘
```

Simple, no external servers needed! 🚀
