#!/bin/bash
set -e

echo "🔄 Staging changes..."
git add live-server/auth/verifyFirebase.js
git add live-server/game/botEngine.js
git add live-server/package.json
git add live-server/public/lobby-preview.html
git add live-server/server.js
git add LOBBY_HUB_INTEGRATION.md

echo "📝 Committing changes..."
git commit -m "Add Firebase profile integration and realistic bot names with avatars

Major features:
- Firebase user profile loading from Firestore users collection
- GET /profile endpoint for authenticated user data
- Display user's photoURL/avatar in lobby from Hub
- Auto-populate user stats (reps, score, wins, tickets)
- Realistic bot names (FirstName_LastName##) instead of BotAlpha/BotBeta
- Random avatar generation for bots (18 colors, initials-based)
- Avatar display in lobby player list (40px circular)
- Avatar display in stretching room waiting list (24px)
- Discord VC integration for session creation
- WebSocket lobby connection for real-time session updates
- axios dependency for Discord bot HTTP calls

Files modified:
- verifyFirebase.js: Added getUserProfile() function
- server.js: Added /profile endpoint and Discord bot integration
- lobby-preview.html: Profile loading, avatar display, stretching room
- botEngine.js: Realistic name generation with avatar system
- package.json: Added axios dependency
- LOBBY_HUB_INTEGRATION.md: Complete integration documentation"

echo "⬆️  Pushing to GitHub..."
git push origin main

echo "✅ All changes pushed successfully!"
