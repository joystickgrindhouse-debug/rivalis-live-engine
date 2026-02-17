#!/bin/bash
# Start Both Services - Live Server + Discord Bot

echo "🚀 Starting Rivalis Backend Services..."
echo ""

# Check if we're in the right directory
if [ ! -d "live-server" ] || [ ! -d "discord-bot" ]; then
  echo "❌ Error: Must run from rivalis-live-engine root directory"
  exit 1
fi

# Start Live Server in background
echo "📡 Starting Live Server (Port 8080)..."
cd live-server
npm install > /dev/null 2>&1
nohup npm start > ../live-server.log 2>&1 &
LIVE_PID=$!
cd ..
echo "   ✅ Live Server started (PID: $LIVE_PID)"
echo "   📋 Logs: tail -f live-server.log"
echo ""

# Wait a moment for server to initialize
sleep 2

# Start Discord Bot in background
echo "🤖 Starting Discord Bot (Port 5000)..."
cd discord-bot
npm install > /dev/null 2>&1
nohup npm start > ../discord-bot.log 2>&1 &
BOT_PID=$!
cd ..
echo "   ✅ Discord Bot started (PID: $BOT_PID)"
echo "   📋 Logs: tail -f discord-bot.log"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 3
echo ""

# Test both services
echo "🧪 Testing services..."
echo ""

# Test Live Server
LIVE_HEALTH=$(curl -s http://localhost:8080/health 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ Live Server:   http://localhost:8080 - HEALTHY"
else
  echo "❌ Live Server:   http://localhost:8080 - NOT RESPONDING"
fi

# Test Discord Bot
BOT_HEALTH=$(curl -s http://localhost:5000/health 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ Discord Bot:   http://localhost:5000 - HEALTHY"
else
  echo "❌ Discord Bot:   http://localhost:5000 - NOT RESPONDING"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎮 RIVALIS BACKEND SERVICES RUNNING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 Live Server:  http://localhost:8080"
echo "🤖 Discord Bot:  http://localhost:5000"
echo ""
echo "📋 View Logs:"
echo "   Live:   tail -f live-server.log"
echo "   Bot:    tail -f discord-bot.log"
echo "   Both:   tail -f live-server.log discord-bot.log"
echo ""
echo "🛑 Stop Services:"
echo "   kill $LIVE_PID $BOT_PID"
echo "   OR run: ./STOP_ALL_SERVICES.sh"
echo ""
echo "🧪 Test Commands:"
echo "   curl http://localhost:8080/health"
echo "   curl http://localhost:5000/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save PIDs for later
echo "$LIVE_PID" > .live-server.pid
echo "$BOT_PID" > .discord-bot.pid

echo "💾 Process IDs saved to:"
echo "   .live-server.pid"
echo "   .discord-bot.pid"
echo ""
