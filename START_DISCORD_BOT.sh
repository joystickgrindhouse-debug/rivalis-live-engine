#!/bin/bash
# Discord Bot Startup Script

echo "🤖 Starting Rivalis Discord Bot..."
echo ""

# Navigate to discord-bot directory
cd /workspaces/rivalis-live-engine/discord-bot

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found!"
  echo ""
  echo "Create .env file with:"
  echo "  DISCORD_TOKEN=your_bot_token"
  echo "  DISCORD_GUILD_ID=your_server_id"
  echo "  BOT_PORT=5000"
  echo "  DISCORD_WINNER_CHANNEL_ID=your_channel_id"
  echo "  WINNER_ROLE_NAME=Champion"
  echo "  DISCORD_PREMIUM_ROLE_DURATION_MINUTES=60"
  echo "  FIREBASE_SERVICE_ACCOUNT={...}"
  echo ""
  exit 1
fi

# Start the bot
echo "🚀 Starting Discord bot on port 5000..."
echo ""
node bot.js
