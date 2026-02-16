#!/bin/bash

# Discord Bot Installation Script

echo "🤖 Installing Discord Bot Dependencies..."
npm install

if [ $? -eq 0 ]; then
  echo "✅ Installation complete!"
  echo ""
  echo "📋 Next steps:"
  echo "1. Ensure .env is configured with:"
  echo "   - DISCORD_TOKEN"
  echo "   - DISCORD_GUILD_ID"
  echo "   - FIREBASE_SERVICE_ACCOUNT"
  echo ""
  echo "2. Start the bot:"
  echo "   npm start"
  echo ""
else
  echo "❌ Installation failed. Check the error above."
  exit 1
fi
