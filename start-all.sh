#!/bin/bash

echo "🚀 Starting Rivalis Live Engine..."

# Start Discord bot in background
echo "📡 Starting Discord bot..."
cd discord-bot
node bot.js &
BOT_PID=$!
cd ..

# Wait a moment for bot to initialize
sleep 2

# Start live server in background
echo "🎮 Starting live server..."
cd live-server
node server.js &
SERVER_PID=$!
cd ..

echo ""
echo "✅ Both services started!"
echo "📡 Discord bot PID: $BOT_PID"
echo "🎮 Live server PID: $SERVER_PID"
echo ""
echo "🌐 Access lobby at: http://localhost:8080/lobby-preview.html"
echo ""
echo "To stop both services, run: kill $BOT_PID $SERVER_PID"
echo "Or press Ctrl+C to stop this script"

# Keep script running
wait
