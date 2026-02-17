# Live Engine Backend-Only Setup (Copy/Paste Ready)

Use this when you want your rivalis-live-engine repo to run only as backend services (Live Server + Discord Bot), while Hub remains the UI and gameplay owner.

---

## 1) Run this in rivalis-live-engine repo root

Copy/paste everything below into terminal:

```bash
set -e

git add -A
git commit -m "pre-backend-only snapshot" || true
git checkout -b backend-only

mkdir -p _archive_backend_only/root
shopt -s dotglob nullglob

keep=(
  .git .github
  live-server
  discord-bot
  package.json
  ecosystem.config.js
  .gitignore
  .editorconfig
  README.md
  DEPLOYMENT.md
)

is_keep() {
  local x="$1"
  for k in "${keep[@]}"; do [[ "$x" == "$k" ]] && return 0; done
  return 1
}

for item in * .*; do
  [[ "$item" == "." || "$item" == ".." ]] && continue
  if ! is_keep "$item"; then
    mv "$item" "_archive_backend_only/root/" || true
  fi
done

mkdir -p _archive_backend_only/live-server-public
if [ -d live-server/public ]; then
  find live-server/public -maxdepth 1 -type f \
    \( -name "*.html" -o -name "CLIENT_*" -o -name "*integration*" \) \
    -exec mv {} _archive_backend_only/live-server-public/ \; || true
fi

cat > live-server/.env.example << 'EOF'
PORT=8080
NODE_ENV=production
FIREBASE_SERVICE_ACCOUNT={"type":"service_account", "...":"..."}
DISCORD_BOT_URL=http://localhost:5000
HUB_API_URL=https://your-hub-domain.vercel.app
HUB_API_SECRET=replace-with-strong-secret
EOF

cat > discord-bot/.env.example << 'EOF'
BOT_PORT=5000
NODE_ENV=production
DISCORD_TOKEN=replace-me
DISCORD_GUILD_ID=replace-me
EOF

(cd live-server && npm install)
(cd discord-bot && npm install)

echo "Backend-only conversion complete."
echo "Run these in separate terminals:"
echo "cd live-server && npm start"
echo "cd discord-bot && npm start"
echo "Health checks:"
echo "curl http://localhost:8080/health"
echo "curl http://localhost:5000/health"
```

---

## 2) Hub env values to connect to it

Set these in your Hub deployment:

```env
LIVE_ENGINE_URL=https://your-live-server-host
LIVE_ENGINE_DISCORD_BOT_URL=https://your-discord-bot-host
VITE_USE_LIVE_ENGINE_ROOMS=true
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_WINNER_CHANNEL_ID=your_channel_id_for_announcements
```

Also keep the same social image URL config from live repo in Hub:

- Source in live repo: `live-server/config/socialImages.js`
- Mirrored in this Hub repo: `replit_integrations/live-engine-sync/socialImages.js`

---

## 2.5) Discord bot winner announcements with stacking roles (up to 7x)

The Discord bot (`discord-bot/bot.js`) now includes a `/announce-winner` endpoint that:

- **Announces winners** to a designated Discord channel with rich embeds
- **Grants stacking temporary roles** that upgrade with each win (up to 7 times)
- **Auto-removes roles** after a configurable duration (default 60 minutes)
- **Tracks role stacks** in Firebase to persist across bot restarts

### Role Stacking System

Winners receive progressively upgraded roles:
- 1st win: `Champion` (Gold)
- 2nd win: `Champion x2` (Orange)
- 3rd win: `Champion x3` (Tomato)
- 4th win: `Champion x4` (Red)
- 5th win: `Champion x5` (Dark Red)
- 6th win: `Champion x6` (Darker Red)
- 7th win: `Champion x7` (Deepest Red) - **MAX STACK**

Each new win removes the old role and grants the next level. The role expires after 60 minutes (configurable).

### Required Environment Variables

Add to `discord-bot/.env`:

```env
DISCORD_WINNER_CHANNEL_ID=your_channel_id_for_announcements
DISCORD_PREMIUM_ROLE_DURATION_MINUTES=60
WINNER_ROLE_NAME=Champion
```

### Testing the Winner Announcement

```bash
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"test-session-123",
    "winnerDiscordId":"123456789012345678",
    "winnerName":"FitWarrior42",
    "winnerScore":4200,
    "exerciseName":"pushups",
    "totalReps":42
  }'
```

Expected response:
```json
{
  "success": true,
  "sessionId": "test-session-123",
  "winnerName": "FitWarrior42",
  "winnerScore": 4200,
  "roleGrant": {
    "granted": true,
    "roleId": "987654321098765432",
    "roleName": "Champion x3",
    "stackCount": 3,
    "durationMinutes": 60
  },
  "announcement": {
    "sent": true,
    "channelId": "123456789012345678"
  }
}
```

### Integration with Hub

When a match ends in Hub, call this endpoint from your Live Engine session cleanup:

```js
// In Hub's session end handler
const response = await fetch(`${LIVE_ENGINE_DISCORD_BOT_URL}/announce-winner`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    winnerDiscordId: winner.discordId,
    winnerName: winner.username,
    winnerScore: winner.finalScore,
    exerciseName: session.exercise,
    totalReps: winner.totalReps,
  }),
});
```

Then restart bot:

```bash
cd discord-bot && npm start
```

---

## 3) Verify end-to-end

1. Hit Hub bridge health endpoint:

```bash
curl https://your-hub-domain/api/live-engine/health
```

2. Create a room in Hub Live mode.
3. Confirm a Discord VC invite link appears in lobby.
4. Start match and confirm Hub gameplay still runs from Hub logic.

5. Test session archive payload (with social image support copied from your Live setup):

```bash
curl -X POST https://your-hub-domain/api/live-engine/sessions/ended \
  -H "Authorization: Bearer your_hub_api_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"test-session-123",
    "endedAt": 1769995644271,
    "winner":{"userId":"test-user","finalScore":4200},
    "finalLeaderboard":[{"userId":"test-user","finalScore":4200,"finalReps":42,"placement":1}],
    "sessionDurationMs":300000,
    "exerciseName":"pushups",
    "gameMode":"classic",
    "imageId":2
  }'
```

Then verify archive includes `socialImage`:

```bash
curl https://your-hub-domain/api/live-engine/session/test-session-123
```

6. Test social share bonus (+100 tickets by default):

```bash
curl -X POST https://your-hub-domain/api/live-engine/share-bonus \
  -H "Authorization: Bearer your_hub_api_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"test-user",
    "sessionId":"test-session-123",
    "platform":"twitter",
    "bonusTickets":100,
    "postUrl":"https://x.com/example/status/123"
  }'
```

Expected response includes `"success": true` and `"awardedTickets": 100`.

Notes:
- Endpoint is idempotent per `sessionId + platform` (same share won't double-award).
- If `bonusTickets` is omitted, Hub awards `100` by default.
- Session archive route accepts `socialImage`, `imageId`, or `imageUrl`; if omitted, Hub selects a random URL from your copied social image config.

7. Test winner announcement with stacking roles (up to 7x):

```bash
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"test-session-123",
    "winnerDiscordId":"123456789012345678",
    "winnerName":"SmartFitness90",
    "winnerScore":4200,
    "exerciseName":"pushups",
    "totalReps":42
  }'
```

Expected behavior:
- Discord channel receives rich embed winner announcement
- Winner gets stacking role (Champion → Champion x2 → ... → Champion x7)
- Each win upgrades the role (old role removed, new one added)
- Role color intensifies with each stack (Gold → Orange → Red → Dark Red)
- Role auto-removes after 60 minutes (configurable)
- Maximum stack is 7; reaching max displays special message

Test multiple wins:
```bash
# First win - grants "Champion"
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-1","winnerDiscordId":"YOUR_DISCORD_ID","winnerName":"TestUser","winnerScore":1000,"exerciseName":"pushups","totalReps":20}'

# Second win - upgrades to "Champion x2"
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-2","winnerDiscordId":"YOUR_DISCORD_ID","winnerName":"TestUser","winnerScore":1500,"exerciseName":"squats","totalReps":25}'

# Continue testing up to x7...
```

---

## 4) Rollback if needed

In rivalis-live-engine repo:

```bash
git checkout main
git branch -D backend-only
```

(Or keep backend-only branch and merge only after validation.)
