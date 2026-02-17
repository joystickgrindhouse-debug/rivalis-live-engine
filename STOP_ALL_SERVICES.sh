#!/bin/bash
# Stop All Services - Live Server + Discord Bot

echo "🛑 Stopping Rivalis Backend Services..."
echo ""

# Try to read saved PIDs
if [ -f ".live-server.pid" ]; then
  LIVE_PID=$(cat .live-server.pid)
  if kill -0 $LIVE_PID 2>/dev/null; then
    kill $LIVE_PID
    echo "✅ Stopped Live Server (PID: $LIVE_PID)"
  else
    echo "⚠️  Live Server already stopped"
  fi
  rm .live-server.pid
else
  # Fallback: kill by process name
  pkill -f "node.*server.js" && echo "✅ Stopped Live Server" || echo "⚠️  No Live Server running"
fi

if [ -f ".discord-bot.pid" ]; then
  BOT_PID=$(cat .discord-bot.pid)
  if kill -0 $BOT_PID 2>/dev/null; then
    kill $BOT_PID
    echo "✅ Stopped Discord Bot (PID: $BOT_PID)"
  else
    echo "⚠️  Discord Bot already stopped"
  fi
  rm .discord-bot.pid
else
  # Fallback: kill by process name
  pkill -f "node.*bot.js" && echo "✅ Stopped Discord Bot" || echo "⚠️  No Discord Bot running"
fi

echo ""
echo "✅ All services stopped"
echo ""

# Clean up log files (optional)
read -p "Delete log files? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -f live-server.log discord-bot.log
  echo "🗑️  Log files deleted"
fi

echo ""
echo "To restart: ./START_ALL_SERVICES.sh"
echo ""
