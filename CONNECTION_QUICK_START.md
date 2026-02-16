# 🎯 Quick Connection Summary: Termux Live Server → Vercel Hub

## The Setup (In Plain English)

**Live Server** (running on your Termux phone)
- Runs on `http://[your-device-ip]:8080`
- Executes game logic, tracks reps, manages sessions
- Sends data to Hub via HTTPS API calls

**Hub** (deployed on Vercel cloud)
- Runs on `https://[your-project].vercel.app`
- Receives rep data and session results
- Stores everything in Firebase Firestore
- Awards raffle tickets and stores user achievements

**Connection Method:** Secure HTTPS API with Bearer token authentication

---

## The Bare Minimum Steps

### 1. **Vercel Hub - Add Environment Variable** ⚙️

```
Variable Name:  HUB_API_SECRET
Value:          a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5

→ Go to Vercel Dashboard → Your Hub Project → Settings → Environment Variables
→ Add both variables → Redeploy
```

### 2. **Termux Live Server - Create .env File** 📝

```bash
cd /workspaces/rivalis-live-engine/live-server

cat > .env << 'EOF'
HUB_API_URL=https://your-hub-project.vercel.app
HUB_API_SECRET=a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5
FIREBASE_ADMIN_SDK={"your":"firebase","credentials":"here"}
EOF
```

### 3. **Test Connection** 🧪

```bash
curl -X POST https://your-hub-project.vercel.app/api/live-engine/reps/completed \
  -H "Authorization: Bearer a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","playerId":"p1","exercise":"pushups","repsAdded":5,"scoreAdded":25,"formScore":90,"depth":0.8,"timestamp":'$(date +%s)000',"sessionId":"test-session","totalSessionReps":5,"totalSessionScore":25}'
```

**Expected:** `{"success":true, "message":"Rep recorded..."}`

### 4. **Start Live Server** ▶️

```bash
cd /workspaces/rivalis-live-engine/live-server
npm start
```

---

## What You Need to Know

### ✅ The Connection Architecture

```
Termux (Live Server)               Vercel (Hub)
    ↓                              ↓
User plays game  ←→  Socket.io  ←→  Real-time state
    ↓                              ↓
Rep completed                    Firebase
    ↓                              ↓
hubSync.js sends HTTPS POST to Hub/api/live-engine/reps/completed
    ↓                              ↓
Bearer token: HUB_API_SECRET       Validates token matches
    ↓                              ↓
JSON payload                     Updates user stats
    ↓                              ↓
Return 200 OK                    Awards +1 raffle ticket
```

### ✅ What Gets Sent Automatically

**After each rep:**
- User ID
- Rep count
- Score
- Exercise name
- Session ID
- Timestamp

**After session ends:**
- Session results (winner, final scores)
- Game mode (Classic, Chaos, Speed Demon, etc.)
- Social image URL (random selection)
- Duration
- Final leaderboard

**When user shares results:**
- User gets +100 social share bonus tickets (auto-award from Hub)

### ⚠️ Critical: Don't Change These

1. **Bearer token format** - Must be exactly: `Authorization: Bearer {SECRET}`
2. **HUB_API_SECRET** - Must match on BOTH Vercel AND Termux
3. **Endpoint paths** - Don't rename `/api/live-engine/reps/completed`
4. **HTTP headers** - Content-Type must be `application/json`

### 🔴 If It Breaks

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Token mismatch | Check HUB_API_SECRET matches on both sides |
| `ENOTFOUND` | Can't reach Hub | Verify Hub URL, check Vercel deployment |
| `Connection refused` | Live Server not running | Start with `npm start` |
| No data syncing | HUB_API_URL missing in .env | Create `.env` file with HUB_API_URL |

---

## Files You Need to Share with Hub Repository

Copy these files to your Hub repository:

1. **[HUB_FILE_1_routes.js](../HUB_FILE_1_routes.js)**
   - Contains: `handleRepCompleted()`, `handleSessionEnded()`, `handleShareBonus()`, `getSessionData()`
   - Place in: `/api/live-engine-sync.js` or similar

2. **[live-server/config/socialImages.js](../../live-server/config/socialImages.js)**
   - Contains: 4 social image URLs and random selection
   - Place in: `/lib/socialImages.js` or similar

3. **[live-server/config/gameModes.js](../../live-server/config/gameModes.js)**
   - Contains: 5 game mode definitions (Classic, Chaos, Speed Demon, Endurance, Pure Grind)
   - Already on Live Server, Hub uses it for validation

---

## The Data Flow (Session Creation to Raffle)

```
1. User starts game on Hub Live Mode
   ↓
2. Hub creates WebSocket connection to Live Server
   └─ Passes: gameMode, exerciseName, userId, etc.
   
3. Live Server validates gameMode exists
   ↓
4. Session created with mode config stored
   
5. User exercises, completes reps
   ↓
6. hubSync.js sends HTTPS POST to Hub
   └─ /api/live-engine/reps/completed
   └─ +1 raffle ticket per rep
   
7. Session ends (timeout or everyone eliminated)
   ↓
8. hubSync.js sends session summary to Hub
   └─ /api/live-engine/sessions/ended
   └─ Winner, final leaderboard, gameMode, social image
   
9. Results page displayed
   ↓
10. User clicks "Share to Facebook/Twitter/WhatsApp"
   ↓
11. results.html POSTs to Hub
   └─ /api/live-engine/share-bonus
   └─ +100 raffle tickets awarded
   
12. Firebase archive updated with:
   └─ All reps from session
   └─ Game mode used
   └─ Social share status
   └─ Total raffle tickets (earned + bonus)
```

---

## Verification Checklist

Before starting:

- [ ] I have my Vercel Hub URL (looks like `https://xxx.vercel.app`)
- [ ] I've set `HUB_API_SECRET` in Vercel environment variables
- [ ] I've redeployed Vercel after adding env variables
- [ ] I've created `.env` file in Termux Live Server with `HUB_API_URL` and `HUB_API_SECRET`
- [ ] Both `HUB_API_SECRET` values are identical
- [ ] I've added `HUB_FILE_1_routes.js` to Hub repository
- [ ] I've added `socialImages.js` to Hub repository
- [ ] Hub version of routes imports socialImages correctly

---

## Support Commands

```bash
# Check if env variables are loaded (from Live Server)
node -e "console.log('URL:', process.env.HUB_API_URL); console.log('Secret set:', !!process.env.HUB_API_SECRET);"

# Test connection to Hub
curl -i https://your-hub-project.vercel.app/api/session/test

# View Live Server logs
npm start  # Run in foreground

# Check what's in your .env file
cat /workspaces/rivalis-live-engine/live-server/.env

# See if port 8080 is in use
netstat -tlnp | grep 8080
```

---

**For detailed setup steps, see:** [CONNECT_TERMUX_TO_VERCEL_HUB.md](./CONNECT_TERMUX_TO_VERCEL_HUB.md)
