#!/bin/bash

echo "🛑 Stopping all Rivalis services..."

# Kill Discord bot
pkill -f "node.*discord-bot/bot.js"

# Kill live server
pkill -f "node.*live-server/server.js"

echo "✅ All services stopped"
