#!/bin/bash

# Copy Live Engine Sync module to Hub repo
# Usage: ./COPY_TO_HUB.sh /path/to/your/Hub-solo-broken-burnoutsnoauth

if [ -z "$1" ]; then
  echo "❌ Please provide the path to your Hub repo"
  echo "Usage: ./COPY_TO_HUB.sh /path/to/Hub-solo-broken-burnoutsnoauth"
  exit 1
fi

HUB_PATH="$1"

if [ ! -d "$HUB_PATH" ]; then
  echo "❌ Hub repo not found at: $HUB_PATH"
  exit 1
fi

echo "📦 Copying live-engine-sync module to Hub repo..."

# Create directory if needed
mkdir -p "$HUB_PATH/replit_integrations/live-engine-sync"

# Copy files
cp -v replit_integrations/live-engine-sync/routes.js "$HUB_PATH/replit_integrations/live-engine-sync/"
cp -v replit_integrations/live-engine-sync/index.js "$HUB_PATH/replit_integrations/live-engine-sync/"

echo ""
echo "✅ Files copied!"
echo ""
echo "📝 Next steps:"
echo "1. Add to Hub's server.js (line ~7):"
echo '   const { registerLiveEngineSyncRoutes } = require("./replit_integrations/live-engine-sync");'
echo ""
echo "2. Add to Hub's server.js (before app.listen):"
echo "   registerLiveEngineSyncRoutes(app);"
echo ""
echo "3. Set HUB_API_SECRET in Vercel environment variables"
echo ""
echo "4. Deploy Hub to Vercel"
