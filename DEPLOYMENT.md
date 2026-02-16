# 🚀 Rivalis Live - Deployment & Operations Guide

Complete guide for deploying and operating the Rivalis Live multiplayer fitness game engine on Android Termux and production environments.

## 📦 Project Generated

All files have been generated and are production-ready. No pseudocode or placeholders.

### Generated Structure

```
rivalis-live-engine/
├── .gitignore                          # Git ignore rules
├── README.md                           # Comprehensive documentation
├── API_TEST.js                         # HTTP API testing script
├── CLIENT_EXAMPLE.js                   # WebSocket client example
├── ecosystem.config.js                 # PM2 process management config
│
├── live-server/                        # WebSocket Game Engine
│   ├── server.js                       # Main server (Express + WebSocket)
│   ├── package.json                    # Dependencies only (allowed)
│   ├── .env.example                    # Environment template
│   │
│   ├── auth/
│   │   └── verifyFirebase.js           # Firebase token verification
│   │
│   ├── sockets/
│   │   └── socketHandler.js            # WebSocket connection handling
│   │
│   ├── game/
│   │   ├── sessionManager.js           # Game session orchestration
│   │   ├── turnManager.js              # Turn-based logic & card effects
│   │   ├── repEngine.js                # Rep scoring & calculations
│   │   ├── antiCheat.js                # Anti-cheat validation engine
│   │   ├── deckEngine.js               # Card deck management
│   │   └── eliminationEngine.js        # Player elimination tracking
│   │
│   └── config/
│       └── limits.js                   # Performance tuning constants
│
└── discord-bot/                        # Discord Voice Integration
    ├── bot.js                          # Discord bot (lightweight)
    ├── package.json                    # Dependencies only (allowed)
    └── .env.example                    # Environment template
```

## ⚙️ Environment Setup

### Prerequisites

**For development/testing:**
- Node.js 18 or higher
- npm or yarn
- Firebase service account JSON
- Discord bot token & guild ID

**For Android Termux:**
```bash
pkg install -y nodejs npm git openssh
npm install -g pm2
```

## 🔧 Local Development Setup

### 1. Install Dependencies

```bash
# Live Server
cd live-server
npm install
cd ..

# Discord Bot
cd discord-bot
npm install
cd ..
```

### 2. Configure Environment Variables

**Live Server** - Create `live-server/.env`:
```bash
PORT=8080
NODE_ENV=development
DISCORD_BOT_URL=http://localhost:5000

# Firebase Service Account (get from Firebase Console)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

**Discord Bot** - Create `discord-bot/.env`:
```bash
BOT_PORT=5000
NODE_ENV=development

# Discord Bot Token (create at Discord Developer Portal)
DISCORD_TOKEN=your_bot_token_here

# Guild ID where bot will operate
DISCORD_GUILD_ID=your_guild_id_here
```

### 3. Run Locally

**Terminal 1 - Live Server:**
```bash
cd live-server
npm start
# Should output: 🚀 Server running on port 8080
```

**Terminal 2 - Discord Bot:**
```bash
cd discord-bot
npm start
# Should output: ✅ Bot logged in as BotName#0000
```

### 4. Test the Setup

**Terminal 3 - Run tests:**
```bash
node API_TEST.js
```

This will:
- ✅ Check health endpoints
- ✅ Create a test session
- ✅ Test Discord voice channel creation
- ✅ Clean up resources

## 📱 Android Termux Deployment

### Step 1: Install on Termux

```bash
# If first time, update packages
pkg update -y

# Install Node.js and Git
pkg install -y nodejs npm git

# Install PM2 globally
npm install -g pm2
```

### Step 2: Clone Repository

```bash
cd ~
git clone https://github.com/your-repo/rivalis-live-engine.git
cd rivalis-live-engine
```

### Step 3: Install Dependencies

```bash
# Install all dependencies
npm run install-all

# Or manually:
cd live-server && npm install && cd ..
cd discord-bot && npm install && cd ..
```

### Step 4: Configure Environment

Create `.env` files in both service directories:

```bash
# Live server config
cat > live-server/.env << 'EOF'
PORT=8080
NODE_ENV=production
FIREBASE_SERVICE_ACCOUNT='...'
DISCORD_BOT_URL=http://localhost:5000
EOF

# Discord bot config
cat > discord-bot/.env << 'EOF'
BOT_PORT=5000
NODE_ENV=production
DISCORD_TOKEN=your_token
DISCORD_GUILD_ID=your_guild_id
EOF
```

### Step 5: Allow Wake Lock (Important!)

```bash
# Edit Termux startup to keep device awake
termux-setup-storage

# Create keep-alive script
cat > keep-alive.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
while true; do
  sleep 300
done
EOF

chmod +x keep-alive.sh
```

### Step 6: Start with PM2

```bash
# Start both services
pm2 start ecosystem.config.js --env production

# Save PM2 startup script
pm2 startup
# Follow the printed instructions

# Save PM2 configuration
pm2 save
```

### Step 7: Monitor

```bash
# View live monitoring
pm2 monit

# View logs
pm2 logs

# View specific service logs
pm2 logs rivalis-live
pm2 logs rivalis-bot
```

### Keep Device Awake Options

**Option 1: Termux:Boot (Recommended)**
```bash
# Install Termux:Boot from F-Droid
# Create boot script
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/rivalis-live-engine
pm2 start ecosystem.config.js --env production
EOF
chmod +x ~/.termux/boot/start.sh
```

**Option 2: Keep Display On**
- Settings → Display → Sleep → Never (while plugged in)

**Option 3: CPU Keep-Alive**
```bash
# Prevent CPU from sleeping
while true; do yes > /dev/null; done &
```

## 📊 Production Deployment

### Using PM2 on Linux Server

```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start ecosystem.config.js --env production

# Setup auto-restart on reboot
pm2 startup systemd -u user --hp /home/user
pm2 save
```

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy both services
COPY live-server ./live-server
COPY discord-bot ./discord-bot
COPY ecosystem.config.js .

# Install dependencies
RUN npm install -g pm2 && \
    cd live-server && npm install && \
    cd ../discord-bot && npm install && \
    cd ..

# Expose ports
EXPOSE 8080 5000

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
```

Build and run:
```bash
docker build -t rivalis-live .
docker run -d \
  -e FIREBASE_SERVICE_ACCOUNT='...' \
  -e DISCORD_TOKEN='...' \
  -e DISCORD_GUILD_ID='...' \
  -p 8080:8080 \
  -p 5000:5000 \
  rivalis-live
```

## 🔍 Monitoring & Maintenance

### Health Checks

```bash
# Live Server Health
curl http://localhost:8080/health

# Bot Health
curl http://localhost:5000/health
```

### Monitoring Metrics

```bash
# Memory usage
pm2 monit

# Detailed process info
pm2 show rivalis-live
pm2 show rivalis-bot

# Log tailing
pm2 logs rivalis-live --lines 100
pm2 logs rivalis-bot --lines 100
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| High memory usage | Reduce `MAX_CONCURRENT_PLAYERS` in `config/limits.js` |
| WebSocket timeouts | Check network connectivity, increase `HEARTBEAT_INTERVAL_MS` |
| Discord bot not connecting | Verify token, check bot permissions in guild |
| Sessions not cleaning up | Check `SESSION_CLEANUP_INTERVAL_MS` setting |
| Process crashes | Check logs: `pm2 logs` |

## 🔐 Security Checklist

- [ ] Firebase service account stored securely (never in version control)
- [ ] Discord token never committed to git
- [ ] `.env` files in `.gitignore`
- [ ] HTTPS/WSS configured if exposed publicly
- [ ] Rate limiting enabled if behind reverse proxy
- [ ] Firewall rules configured (only needed ports open)
- [ ] Regular backups of session data if persisting
- [ ] Monitor suspicion scores for cheating detection

## 🧪 Performance Tuning

### For Low-End Android

Edit `live-server/config/limits.js`:

```javascript
// Reduce for 2GB RAM devices
MAX_CONCURRENT_PLAYERS: 15,          // 30 → 15
MAX_SESSIONS: 5,                     // 10 → 5

// Increase timeouts for unstable network
HEARTBEAT_INTERVAL_MS: 35000,        // 25000 → 35000
CONNECTION_TIMEOUT_MS: 45000,        // 30000 → 45000

// Adjust memory limits
LIVE_SERVER_MEMORY_LIMIT_MB: 150,    // 250 → 150
BOT_MEMORY_LIMIT_MB: 100,            // 150 → 100
```

### For High-End Servers

```javascript
MAX_CONCURRENT_PLAYERS: 50,          // 30 → 50
MAX_SESSIONS: 20,                    // 10 → 20
TURN_TIME_MS: 180000,                // 120000 → 180000 (longer turns)

LIVE_SERVER_MEMORY_LIMIT_MB: 500,    // 250 → 500
BOT_MEMORY_LIMIT_MB: 300,            // 150 → 300
```

## 📈 Scaling Strategy

### Horizontal Scaling (Multiple Instances)

```bash
# ecosystem.config.js - Multiple instances
{
  name: 'rivalis-live',
  instances: 4,  // Run 4 instances
  exec_mode: 'cluster',  // Cluster mode
  // ... rest of config
}
```

**Note:** Current implementation uses in-memory state. For clustering, consider:
1. Adding Redis for shared session state
2. Loading balancing with sticky sessions
3. Session migration between instances

### Vertical Scaling (Better Hardware)

Simply increase `MAX_CONCURRENT_PLAYERS` and memory limits in config.

## 🔄 Updates & Maintenance

### Updating Code

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Restart services
pm2 restart all

# Or go zero-downtime with ecosystem config
pm2 reload ecosystem.config.js --env production
```

### Scheduled Maintenance

Add to crontab:
```bash
# Weekly restart (Sunday 2 AM)
0 2 * * 0 cd ~/rivalis-live-engine && pm2 restart all

# Daily memory check (every morning)
0 7 * * * pm2 monit | mail -s "Rivalis Health" admin@example.com
```

## 📞 Support & Troubleshooting

### Debug Mode

Enable verbose logging:
```bash
# Edit ecosystem.config.js
env: {
  LOG_LEVEL: 'debug',
}

pm2 restart all
```

### Common Commands

```bash
# Stop all services
pm2 stop all

# Start all services
pm2 start all

# Restart all services
pm2 restart all

# Delete all processes
pm2 delete all

# View detailed logs
pm2 logs --lines 1000

# View online processes
pm2 list

# Save PM2 state
pm2 save

# Resurrect saved state
pm2 resurrect
```

## 📄 License

MIT - See LICENSE file

## 🤝 Contributing

Issues and PRs welcome. Please see CONTRIBUTING.md

---

**Architecture optimized for Android Termux** | Built for performance at scale
