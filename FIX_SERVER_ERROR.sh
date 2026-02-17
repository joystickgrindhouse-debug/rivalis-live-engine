#!/bin/bash
# Fix server.js - Replace with minimal version that doesn't need archived files

echo "🔧 Fixing server.js..."

cd /workspaces/rivalis-live-engine/live-server

# Backup current server.js
if [ -f "server.js" ]; then
  echo "📦 Backing up current server.js to server-with-errors.js.bak"
  cp server.js server-with-errors.js.bak
fi

# Replace with minimal version
echo "✅ Replacing server.js with server-minimal.js"
cp server-minimal.js server.js

# Replace sessionManager with minimal version
if [ -f "game/sessionManager-minimal.js" ]; then
  echo "✅ Replacing sessionManager.js with minimal version"
  cp game/sessionManager.js game/sessionManager-original.js.bak 2>/dev/null || true
  cp game/sessionManager-minimal.js game/sessionManager.js
fi

echo ""
echo "✅ Fix complete!"
echo ""
echo "Now run:"
echo "  cd live-server"
echo "  npm start"
echo ""
echo "Expected output:"
echo "  🎮 ===== RIVALIS LIVE - SESSION HOST ====="
echo "  🚀 Server running on port 8080"
echo "  📝 Role: Session lifecycle management"
echo ""
