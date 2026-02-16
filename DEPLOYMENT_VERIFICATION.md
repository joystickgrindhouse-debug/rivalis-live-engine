# Firebase Profile Sync - Deployment Verification Checklist

## ✅ What Has Been Completed

### Code Changes Made

**[1] Modified: live-server/game/sessionManager.js**
- ✅ Added import: `const hubSync = require('../utils/hubSync');` on line 8
- ✅ Added hubSync call in `submitRep()` function after rep validation (line ~284)
  - Sends rep data to Vercel Hub for Firebase sync
  - Non-blocking (doesn't affect game)
- ✅ Enhanced `endSession()` function (line ~324)
  - Transforms leaderboard data
  - Calls `hubSync.sendSessionEndedToHub()` with winner and leaderboard
  - Archives session results to Firebase

**[2] Existing: live-server/utils/hubSync.js**
- ✅ Already created with:
  - `sendRepToHub(sessionData, playerData, repData, repResult)` function
  - `sendSessionEndedToHub(sessionData, leaderboard, winner)` function
  - `postToHub(endpoint, data)` with Bearer token authentication
  - 5-second timeout handling
  - Non-blocking error handling

### New API Route Files Created

**[3] Created: vercel-hub-api-routes/reps-completed.js**
- ✅ Next.js API route for `POST /api/reps/completed`
- ✅ Verifies Bearer token authentication
- ✅ Firebase Admin SDK initialization
- ✅ Updates user stats (totalReps, totalScore)
- ✅ Increments raffleTickets by 1
- ✅ Records rep history
- ✅ Updates leaderboard ranking
- ✅ **Deploy to:** `pages/api/reps/completed.js` in Vercel Hub project

**[4] Created: vercel-hub-api-routes/sessions-ended.js**
- ✅ Next.js API route for `POST /api/sessions/ended`
- ✅ Verifies Bearer token authentication
- ✅ Archives session to Firebase
- ✅ Records winner to Hall of Fame
- ✅ Updates winner's gamesWon counter
- ✅ Records placement statistics (1st/2nd/3rd)
- ✅ **Deploy to:** `pages/api/sessions/ended.js` in Vercel Hub project

### Documentation Created

**[5] Created: FIREBASE_SYNC_SETUP.md**
- ✅ Complete setup guide (15 sections)
- ✅ Step-by-step deployment instructions
- ✅ Environment configuration details
- ✅ Verification testing procedures
- ✅ Firebase security rules template
- ✅ Troubleshooting guide
- ✅ Firebase structure reference
- ✅ Performance optimization tips

**[6] Created: FIREBASE_SYNC_QUICK_REFERENCE.md**
- ✅ One-page quick reference card
- ✅ 3-step deployment checklist
- ✅ Verification checklist
- ✅ Data payload examples
- ✅ Quick troubleshooting
- ✅ Test commands
- ✅ Success criteria

**[7] Created: FIREBASE_PROFILE_SYNC_INTEGRATION.md**
- ✅ Integration summary
- ✅ Complete architecture overview
- ✅ Data flow diagrams
- ✅ Firebase structure reference
- ✅ Deployment checklist
- ✅ Integration checklist
- ✅ Performance characteristics
- ✅ Failover behavior

**[8] Created: COMPLETE_SYSTEM_ARCHITECTURE.md**
- ✅ Full system overview with diagrams
- ✅ Data flow: Rep submission
- ✅ Data flow: Session completion
- ✅ Exercise system architecture
- ✅ Game logic layer details
- ✅ Bot engine specifications
- ✅ Performance optimization
- ✅ Deployment architecture
- ✅ Security & anti-cheat layers
- ✅ Module dependencies
- ✅ Testing checklist
- ✅ Configuration reference

---

## 📋 Pre-Deployment Checklist

### Step 1: Verify Live Server Changes ✅

```bash
# Check hubSync import was added
grep "const hubSync" /workspaces/rivalis-live-engine/live-server/game/sessionManager.js
# Should return: const hubSync = require('../utils/hubSync');

# Check hubSync call in submitRep
grep "hubSync.sendRepToHub" /workspaces/rivalis-live-engine/live-server/game/sessionManager.js
# Should return: hubSync.sendRepToHub(session, player, repPayload, repResult);

# Check hubSync call in endSession
grep "hubSync.sendSessionEndedToHub" /workspaces/rivalis-live-engine/live-server/game/sessionManager.js
# Should return: hubSync.sendSessionEndedToHub(session, finalLeaderboard, winnerData);

# Verify no syntax errors
npm test  # If you have tests setup
# Or just ensure Live Server still starts: pm2 start live-server
```

### Step 2: Verify hubSync.js Exists ✅

```bash
# Check file exists and has functions
cat /workspaces/rivalis-live-engine/live-server/utils/hubSync.js

# Should contain:
# - sendRepToHub function
# - sendSessionEndedToHub function
# - postToHub function
```

### Step 3: Prepare Vercel Hub API Routes ✅

Copy the two files:
```bash
# From workspace
ls -la /workspaces/rivalis-live-engine/vercel-hub-api-routes/

# You should see:
# - reps-completed.js
# - sessions-ended.js
```

---

## 🚀 Deployment Steps

### Your Vercel Hub Project

**Step 1: Copy API Routes**
```bash
# In your Vercel Hub project directory:
cp /workspaces/rivalis-live-engine/vercel-hub-api-routes/reps-completed.js pages/api/reps/completed.js
cp /workspaces/rivalis-live-engine/vercel-hub-api-routes/sessions-ended.js pages/api/sessions/ended.js
```

**Step 2: Set Environment Variables**

In Vercel Dashboard → Settings → Environment Variables:
```
FIREBASE_ADMIN_SDK=<paste-entire-json-from-firebase>
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
HUB_API_SECRET=your-random-generated-secret-here
```

**Step 3: Deploy**
```bash
# In your Vercel Hub project
vercel deploy --prod
```

### Your Live Server (Termux/VPS)

**Step 1: Update .env File**

Create or edit `/live-server/.env`:
```
HUB_API_URL=https://your-hub.vercel.app
HUB_API_SECRET=your-random-generated-secret-here
```

**Step 2: Restart Live Server**
```bash
# SSH into Termux
cd /data/data/com.termux/files/home/rivalis-live-engine

# Update .env file (use nano or your editor)
nano live-server/.env

# Restart
pm2 restart live-server
pm2 logs live-server
```

---

## ✅ Post-Deployment Verification

### Test 1: Submit a Rep and Check Logs

**Live Server Console:**
```bash
pm2 logs live-server | grep HubSync
```

**Expected Output:**
```
[HubSync] Rep synced for userId123
✅ Rep submitted: playerId456 in session789 (+3 reps, +450 score)
```

### Test 2: Check Vercel Logs

```bash
vercel logs --tail 50
```

**Expected Output:**
```
[API] ✅ Rep synced for user userId123: +3 reps, +1 ticket
```

### Test 3: Verify Firebase Updates

**In Firebase Console → Database:**
1. Navigate to `/users/{userId}/stats/totalReps`
   - Should be incremented from previous value
   
2. Navigate to `/users/{userId}/raffleTickets`
   - Should be incremented by 1
   
3. Navigate to `/leaderboards/allTime/{userId}`
   - Should show updated totalReps and totalScore

### Test 4: Run a Full Game Session

1. Start a game session with multiple players
2. Submit reps throughout the game
3. Check logs for each rep sync
4. Complete the game (last player standing)
5. Verify session archived:
   - Check `/sessionArchive/{sessionId}` exists
   - Check `/hallOfFame/{timestamp}-{sessionId}` shows winner
   - Check winner's `/users/{winnerId}/stats/gamesWon` incremented

---

## 🔍 Verification Checklist

### Local Development

- [ ] Cloned/pulled latest code from workspace
- [ ] Verified `sessionManager.js` has hubSync import (line 8)
- [ ] Verified `hubSync.sendRepToHub()` call in submitRep()
- [ ] Verified `hubSync.sendSessionEndedToHub()` call in endSession()
- [ ] Verified `hubSync.js` exists in `/live-server/utils/`
- [ ] No syntax errors in modified files

### Vercel Hub Deployment

- [ ] Copied `reps-completed.js` to `pages/api/reps/completed.js`
- [ ] Copied `sessions-ended.js` to `pages/api/sessions/ended.js`
- [ ] Set `FIREBASE_ADMIN_SDK` in Vercel env (entire JSON pasted)
- [ ] Set `FIREBASE_DATABASE_URL` in Vercel env
- [ ] Set `HUB_API_SECRET` in Vercel env (random 32-char string)
- [ ] Deployed to Vercel: `vercel deploy --prod`
- [ ] Verified deployment was successful (no errors)

### Live Server Configuration

- [ ] Updated `/live-server/.env` with `HUB_API_URL`
- [ ] Updated `/live-server/.env` with `HUB_API_SECRET` (must match Vercel)
- [ ] Restarted Live Server: `pm2 restart live-server`
- [ ] Verified Live Server started without errors: `pm2 logs live-server`

### Firebase Configuration

- [ ] Created/updated Firebase security rules to allow API writes
- [ ] Verified `/users/{userId}` structure in Firebase
- [ ] Verified `/leaderboards` structure in Firebase
- [ ] Verified `/sessionArchive` path exists
- [ ] Verified `/hallOfFame` path exists

### Integration Testing

- [ ] Submitted a rep → confirmed `[HubSync]` log message
- [ ] Verified Vercel logs showed `[API] ✅ Rep synced`
- [ ] Verified Firebase `/users/{userId}/stats/totalReps` incremented
- [ ] Verified Firebase `/users/{userId}/raffleTickets` incremented by 1
- [ ] Ran full game session → session archived to Firebase
- [ ] Verified winner data in `/hallOfFame` entry
- [ ] Verified placement counters updated
- [ ] Verified no performance degradation in Live Server

### Documentation Review

- [ ] Read `FIREBASE_SYNC_QUICK_REFERENCE.md` for quick setup
- [ ] Read `FIREBASE_SYNC_SETUP.md` for detailed troubleshooting
- [ ] Read `COMPLETE_SYSTEM_ARCHITECTURE.md` for system understanding
- [ ] Bookmarked troubleshooting section for future reference

---

## 🆘 If Something Goes Wrong

### "Unauthorized" (401) Errors

**Problem:** API returns 401 Unauthorized

**Solution:**
```bash
# 1. Verify secret matches on both sides
echo $HUB_API_SECRET  # On Live Server

vercel env list       # On Vercel (check HUB_API_SECRET value)

# 2. They MUST be identical
# 3. Restart Live Server if .env changed: pm2 restart live-server
```

### "Firebase not initialized" Error

**Problem:** Vercel logs show Firebase init failed

**Solution:**
```bash
# 1. Verify FIREBASE_ADMIN_SDK is set on Vercel
vercel env list | grep FIREBASE_ADMIN_SDK

# 2. Verify it's the entire JSON pasted correctly (no truncation)
# 3. Check FIREBASE_DATABASE_URL is set and correct
# 4. Redeploy: vercel deploy --prod
```

### Reps Not Syncing

**Problem:** Rep submitted but no Firebase update

**Solution:**
```bash
# 1. Check Live Server logs
pm2 logs live-server | grep -E "HubSync|hubSync"

# 2. If no HubSync log: hubSync import missing
# 3. Check sessionManager.js line 8 has: const hubSync = require('../utils/hubSync');
# 4. Check submitRep() has hubSync.sendRepToHub() call
# 5. Restart: pm2 restart live-server
```

### Raffle Tickets Not Incrementing

**Problem:** repsAdded increments, but raffleTickets stays same

**Solution:**
```bash
# 1. Check Firebase path in reps-completed.js
# 2. Verify path is: /users/{userId}/raffleTickets
# 3. Check Firebase has this path (not /raffle or /tickets etc.)
# 4. Review reps-completed.js increment logic:
#    raffleRef.transaction((tickets) => (tickets || 0) + 1)
```

### Session Not Archived

**Problem:** Game ends but /sessionArchive/{sessionId} not created

**Solution:**
```bash
# 1. Check Vercel logs for /api/sessions/ended calls
vercel logs --grep "sessions/ended"

# 2. Verify endSession() calls hubSync.sendSessionEndedToHub()
# 3. Check Live Server logs for session end event
pm2 logs live-server | grep "🏁"  # Session end marker

# 4. If not calling: verify endSession() modification was saved
```

---

## 📞 Support Resources

### Documentation Files
- [FIREBASE_SYNC_QUICK_REFERENCE.md](FIREBASE_SYNC_QUICK_REFERENCE.md) - Quick setup
- [FIREBASE_SYNC_SETUP.md](FIREBASE_SYNC_SETUP.md) - Detailed guide
- [FIREBASE_PROFILE_SYNC_INTEGRATION.md](FIREBASE_PROFILE_SYNC_INTEGRATION.md) - Integration overview
- [COMPLETE_SYSTEM_ARCHITECTURE.md](COMPLETE_SYSTEM_ARCHITECTURE.md) - Full system design

### Debug Commands

**Check Live Server status:**
```bash
pm2 describe live-server
pm2 logs live-server --tail 50
pm2 logs live-server --err
```

**Check Vercel deployment:**
```bash
vercel logs --tail 100
vercel logs --tail 100 --grep "api/reps"
vercel logs --tail 100 --grep "api/sessions"
```

**Test API directly:**
```bash
# Test /api/reps/completed
curl -X POST https://your-hub.vercel.app/api/reps/completed \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"test-user",
    "playerId":"p1",
    "exercise":"pushups",
    "repsAdded":5,
    "scoreAdded":450,
    "formScore":0.9,
    "depth":0.88,
    "timestamp":'$(date +%s)'000,
    "sessionId":"test-session",
    "totalSessionReps":25,
    "totalSessionScore":3500
  }'

# Test /api/sessions/ended
curl -X POST https://your-hub.vercel.app/api/sessions/ended \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"test-session",
    "winner":{"userId":"test-user","finalReps":25,"finalScore":3500},
    "finalLeaderboard":[{"userId":"test-user","finalReps":25,"finalScore":3500,"placement":1}],
    "endedAt":'$(date +%s)'000,
    "duration":300000,
    "exerciseName":"pushups"
  }'
```

---

## ✅ Success Confirmation

When everything is working correctly, you should see:

1. **Live Server Console:**
   ```
   ✅ Rep submitted: playerId456 in session789 (+3 reps, +450 score)
   [HubSync] Rep synced for userId123
   ```

2. **Vercel Logs:**
   ```
   [API] ✅ Rep synced for user userId123: +3 reps, +1 ticket
   ```

3. **Firebase Updates (real-time):**
   - `/users/{userId}/stats/totalReps` increments
   - `/users/{userId}/raffleTickets` increments by 1
   - `/leaderboards/allTime/{userId}` updates

4. **Session End (in Firebase):**
   - `/sessionArchive/{sessionId}` created with leaderboard
   - `/hallOfFame/{timestamp}-{sessionId}` created with winner
   - `/users/{winnerId}/stats/gamesWon` incremented

5. **Hub Dashboard:**
   - User profile stats update in real-time
   - Raffle ticket count visible
   - Leaderboard rankings reflected
   - Hall of Fame displays winners

---

**Deployment Status:** ✅ Ready to Deploy

**Last Verified:** 2024

**Next Step:** Follow the "Deployment Steps" section above to deploy to your Vercel Hub and Live Server
