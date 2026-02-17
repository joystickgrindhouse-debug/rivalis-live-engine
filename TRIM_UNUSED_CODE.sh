#!/bin/bash
# Trim Unused Code - Keep Only Essential Backend Services
# This removes/archives code that Hub now handles

set -e

echo "🧹 Trimming unused code from rivalis-live-engine..."
echo ""
echo "Architecture:"
echo "  ✅ KEEP: Session hosting API (Live Server)"
echo "  ✅ KEEP: Discord VC + Winner announcements (Discord Bot)"
echo "  ❌ REMOVE: Game logic (Hub owns)"
echo "  ❌ REMOVE: Rep validation (Hub owns)"
echo "  ❌ REMOVE: Anti-cheat (Hub validates)"
echo "  ❌ REMOVE: Frontend files (Hub is frontend)"
echo ""

# Create archive directory
mkdir -p _archive_trimmed/{live-server,root,docs}

# ============= LIVE-SERVER: Remove Hub-owned game logic =============
echo "📦 Archiving game logic files (Hub owns these)..."

if [ -d "live-server/game" ]; then
  # Keep only sessionManager, archive the rest
  mkdir -p _archive_trimmed/live-server/game
  
  [ -f "live-server/game/antiCheat.js" ] && mv live-server/game/antiCheat.js _archive_trimmed/live-server/game/
  [ -f "live-server/game/botEngine.js" ] && mv live-server/game/botEngine.js _archive_trimmed/live-server/game/
  [ -f "live-server/game/deckEngine.js" ] && mv live-server/game/deckEngine.js _archive_trimmed/live-server/game/
  [ -f "live-server/game/eliminationEngine.js" ] && mv live-server/game/eliminationEngine.js _archive_trimmed/live-server/game/
  [ -f "live-server/game/poseValidator.js" ] && mv live-server/game/poseValidator.js _archive_trimmed/live-server/game/
  [ -f "live-server/game/repEngine.js" ] && mv live-server/game/repEngine.js _archive_trimmed/live-server/game/
  [ -f "live-server/game/turnManager.js" ] && mv live-server/game/turnManager.js _archive_trimmed/live-server/game/
  
  echo "  ✓ Archived: antiCheat, botEngine, deckEngine, eliminationEngine"
  echo "  ✓ Archived: poseValidator, repEngine, turnManager"
  echo "  ✓ Kept: sessionManager.js (needed for session lifecycle)"
fi

# ============= LIVE-SERVER: Remove frontend/public files =============
echo "📦 Archiving frontend files (Hub is frontend)..."

if [ -d "live-server/public" ]; then
  mkdir -p _archive_trimmed/live-server/public
  # Archive HTML, CSS, JS client files
  find live-server/public -type f \( -name "*.html" -o -name "*.css" -o -name "CLIENT_*" -o -name "*client*" -o -name "*integration*" \) \
    -exec mv {} _archive_trimmed/live-server/public/ \; 2>/dev/null || true
  echo "  ✓ Archived: HTML, CSS, client files"
fi

# ============= LIVE-SERVER: Remove unused config =============
echo "📦 Archiving unused config files..."

if [ -d "live-server/config" ]; then
  mkdir -p _archive_trimmed/live-server/config
  
  # Archive game logic configs (Hub owns)
  [ -f "live-server/config/cardValues.js" ] && mv live-server/config/cardValues.js _archive_trimmed/live-server/config/
  [ -f "live-server/config/gameModes.js" ] && mv live-server/config/gameModes.js _archive_trimmed/live-server/config/
  [ -f "live-server/config/limits.js" ] && mv live-server/config/limits.js _archive_trimmed/live-server/config/
  
  # Keep: exerciseReferences.js (may be used by session endpoints)
  # Keep: exercises.js (may be used by session endpoints)
  # Keep: socialImages.js (used by Discord bot)
  
  echo "  ✓ Archived: cardValues, gameModes, limits"
  echo "  ✓ Kept: exerciseReferences, exercises, socialImages"
fi

# ============= LIVE-SERVER: Remove sockets (if Hub owns realtime) =============
echo "📦 Archiving socket handlers (Hub handles realtime)..."

if [ -d "live-server/sockets" ]; then
  mkdir -p _archive_trimmed/live-server/sockets
  mv live-server/sockets/* _archive_trimmed/live-server/sockets/ 2>/dev/null || true
  echo "  ✓ Archived: Socket handlers"
fi

# ============= ROOT: Archive duplicate/example files =============
echo "📦 Archiving root-level examples and duplicates..."

root_to_archive=(
  "API_TEST.js"
  "CLIENT_EXAMPLE.js"
  "EXACT_MODULE_COPY_PASTE.js"
  "HUB_CLIENT_GUIDE.md"
  "HUB_CLIENT_REFERENCE.js"
  "HUB_FILE_1_routes.js"
  "HUB_FILE_2_index.js"
  "HUB_FILE_3_server_js_changes.txt"
  "HUB_TERMUX_INTEGRATION.js"
  "hub-client-browser.js"
  "hub-client.js"
  "hub-integration-example.js"
  "pwa-integration-guide.js"
  "REPLIT_INTEGRATION_liveclient.js"
  "COPY_PASTE_FOR_HUB.txt"
  "COPY_TO_HUB.sh"
)

for file in "${root_to_archive[@]}"; do
  [ -f "$file" ] && mv "$file" _archive_trimmed/root/ && echo "  ✓ Archived: $file"
done

# Archive exercise JSON files (can be stored in config instead)
mv *.json _archive_trimmed/root/ 2>/dev/null || true
echo "  ✓ Archived: Exercise JSON files"

# ============= DOCS: Consolidate outdated docs =============
echo "📦 Archiving outdated documentation..."

docs_to_archive=(
  "CONNECT_TERMUX_TO_VERCEL_HUB.md"
  "DEPLOYMENT_VERIFICATION.md"
  "EXERCISE_REFERENCE_INTEGRATION.md"
  "EXERCISE_SYSTEM.md"
  "FIREBASE_PROFILE_SYNC_INTEGRATION.md"
  "FIREBASE_SYNC_QUICK_REFERENCE.md"
  "FIREBASE_SYNC_SETUP.md"
  "INTEGRATION_INSTRUCTIONS.md"
  "LOCALTUNNEL_SETUP.md"
  "NGROK_SETUP.md"
  "PERFORMANCE_REWARDS.md"
  "RIVALIS_HUB_SERVER_INTEGRATION.md"
  "SKELETAL_OVERLAY_GUIDE.md"
  "SOCIAL_SHARING_BONUS.md"
  "TERMUX_DEPLOYMENT.md"
)

for doc in "${docs_to_archive[@]}"; do
  [ -f "$doc" ] && mv "$doc" _archive_trimmed/docs/ && echo "  ✓ Archived: $doc"
done

# ============= SUMMARY =============
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 What's left:"
echo ""
echo "live-server/"
echo "  ├── server.js (session hosting API)"
echo "  ├── game/"
echo "  │   └── sessionManager.js (session lifecycle)"
echo "  ├── config/"
echo "  │   ├── exerciseReferences.js"
echo "  │   ├── exercises.js"
echo "  │   └── socialImages.js"
echo "  └── auth/"
echo "      └── verifyFirebase.js"
echo ""
echo "discord-bot/"
echo "  ├── bot.js (VC + winner announcements + stacking roles)"
echo "  └── package.json"
echo ""
echo "📂 Archived to: _archive_trimmed/"
echo ""
echo "🎯 Next steps:"
echo "  1. Review live-server/server.js - remove unused game endpoints"
echo "  2. cd live-server && npm start"
echo "  3. cd discord-bot && npm start"
echo "  4. Test: curl http://localhost:8080/health"
echo "  5. Test: curl http://localhost:5000/health"
echo ""
