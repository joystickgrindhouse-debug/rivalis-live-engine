# Firebase Profile Sync Setup Guide

This guide explains how to integrate the Live Server rep tracking system with your Vercel Hub, enabling real-time profile updates and raffle ticket increments.

## Architecture Overview

```
Live Server (Termux) 
  ↓ POST /api/reps/completed (via hubSync.js)
Vercel Hub
  ↓ Firebase Transaction
Firebase Realtime Database
  ↓ Real-time sync
User Profiles + Raffle Tickets
```

## Step 1: Copy API Route Files to Vercel Hub

Copy the two API endpoint files to your Next.js Vercel Hub project:

1. **`reps-completed.js`** → `pages/api/reps/completed.js`
   - Handles individual rep submissions
   - Updates user stats, raffle tickets, and leaderboard

2. **`sessions-ended.js`** → `pages/api/sessions/ended.js`
   - Handles session completion
   - Archives results and updates placement records

These are Next.js API routes that will automatically become endpoints:
- `POST https://your-hub.vercel.app/api/reps/completed`
- `POST https://your-hub.vercel.app/api/sessions/ended`

## Step 2: Configure Environment Variables

### On Vercel Hub

Add these environment variables in your Vercel project settings:

```
FIREBASE_ADMIN_SDK=<json-string-from-firebase>
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
HUB_API_SECRET=your-random-secret-key-here
```

**How to get `FIREBASE_ADMIN_SDK`:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy the entire JSON object
4. Convert to escaped string: `JSON.stringify(jsonObject)` in browser console
5. Paste as env var value

### On Live Server (.env)

Create or update `/live-server/.env`:

```
# Hub API Configuration
HUB_API_URL=https://your-hub.vercel.app
HUB_API_SECRET=your-random-secret-key-here
```

> **Important:** Both services must use the **same** `HUB_API_SECRET` value!

## Step 3: Verify Integration

### Test Rep Submission

Submit a rep in the game. On Live Server console, you should see:

```
[HubSync] Rep synced for userId123
✅ Rep submitted: playerId456 in session789 (+3 reps, +450 score)
```

Then on Vercel logs (Dashboard → Functions → Logs):

```
[API] ✅ Rep synced for user userId123: +3 reps, +1 ticket
```

Then check Firebase Realtime Database:
- Navigate to `users/{userId}/stats/totalReps` → should increment
- Navigate to `users/{userId}/raffleTickets` → should increment by 1
- Navigate to `leaderboards/allTime/{userId}` → should show updated total

### Test Session End

When a game session ends, Live Server should post to `/api/sessions/ended`:

```
[HubSync] Session ended for sessionId789
```

And Vercel logs show:

```
[API] ✅ Session archived: sessionId789
```

Check Firebase:
- `sessionArchive/{sessionId}` → complete session results
- `hallOfFame/{timestamp}-{sessionId}` → winner recorded
- `leaderboards/placements/{userId}` → placement counts updated

## Step 4: Firebase Security Rules

Update your Firebase Realtime Database rules to allow API access:

```json
{
  "rules": {
    "users": {
      "$uid": {
        "stats": {
          ".write": "root.child('allowedServices').child('hubApi').val() === true || auth.uid === $uid"
        },
        "raffleTickets": {
          ".write": "root.child('allowedServices').child('hubApi').val() === true || auth.uid === $uid"
        },
        "repHistory": {
          ".write": "root.child('allowedServices').child('hubApi').val() === true || auth.uid === $uid"
        }
      }
    },
    "leaderboards": {
      ".write": "root.child('allowedServices').child('hubApi').val() === true"
    },
    "sessionArchive": {
      ".write": "root.child('allowedServices').child('hubApi').val() === true"
    },
    "hallOfFame": {
      ".write": "root.child('allowedServices').child('hubApi').val() === true"
    },
    "allowedServices": {
      "hubApi": {
        ".value": true
      }
    }
  }
}
```

## Step 5: Monitor and Debug

### Check Live Server Logs

```bash
# SSH into Termux (Android)
ssh -p 8022 user@192.168.1.100

# View recent logs
pm2 logs live-server | grep "HubSync"

# Monitor in real-time
pm2 logs live-server --tail 50
```

### Check Vercel Function Logs

```bash
vercel logs --ascii
```

Or via Dashboard:
1. Open Vercel → Select project → Functions
2. Click "Logs" tab
3. Filter by `/api/reps/completed` or `/api/sessions/ended`

### Enable Debug Mode

Edit `hubSync.js` on Live Server to add detailed logging:

```javascript
// In hubSync.js, before sendRepToHub function:
const DEBUG = process.env.DEBUG_HUB_SYNC === 'true';

// Inside sendRepToHub:
if (DEBUG) console.log('[HubSync DEBUG] Payload:', JSON.stringify(payload, null, 2));
```

Then set in Live Server .env:
```
DEBUG_HUB_SYNC=true
```

## Step 6: Handle Offline Scenarios

If Live Server loses connection to Vercel:

1. **Rep Submission Still Works Locally** ✅
   - Game continues normally
   - Rep counts on Live Server still accurate
   - No data loss (hubSync failures are non-blocking)

2. **Sync Resumes Automatically** ✅
   - When connection restored, next valid rep POSTs successfully
   - Missed reps not re-sent (by design)

3. **For Guaranteed Delivery** (Optional)
   - Implement rep queue in `hubSync.js`
   - Save failed reps to disk/database
   - Retry on connection restore

## Firebase Structure Reference

After integration, your Firebase structure will include:

```
/users/{userId}
  /stats
    /totalReps: 1250
    /totalScore: 45230
    /sessionsPlayed: 42
    /bestScore: 2150
    /gamesWon: 3
    /lastActivityAt: 1699564321000
  /raffleTickets: 1250
  /repHistory
    /{timestamp}
      /exercise: "pushups"
      /repsAdded: 5
      /scoreAdded: 450
      /formScore: 0.92
      /depth: 0.88
      /timestamp: 1699564321000

/leaderboards
  /allTime/{userId}
    /totalReps: 1250
    /totalScore: 45230
    /lastUpdated: 1699564321000
  /placements/{userId}
    /firstPlace: 3
    /secondPlace: 7
    /thirdPlace: 12
    /totalPlacements: 42

/sessionArchive/{sessionId}
  /sessionId: "abc-123-def"
  /exerciseName: "pushups"
  /endedAt: 1699564321000
  /winner:
    /userId: "user1"
    /finalScore: 2150
  /leaderboard: [...]

/hallOfFame/{timestamp}-{sessionId}
  /winnerId: "user1"
  /winnerScore: 2150
  /exercise: "pushups"
  /timestamp: 1699564321000
```

## Troubleshooting

### API Returns 401 Unauthorized

**Problem:** `HUB_API_SECRET` mismatch

**Solution:**
```bash
# Live Server
echo $HUB_API_SECRET

# Compare with Vercel dashboard
vercel env list
```

### Firebase Writes Fail

**Problem:** Security rules too restrictive

**Solution:**
- Temporarily allow all writes: `".write": true`
- Check exact error in Vercel logs
- Update rules to match API payload structure

### Reps Not Syncing

**Problem:** hubSync.js not imported

**Solution:**
- Verify `sessionManager.js` line 8 imports hubSync
- Check `hubSync.js` exists in `/live-server/utils/`
- Verify no typos in import paths

### Raffle Tickets Not Incrementing

**Problem:** Firebase path incorrect

**Solution:**
- Verify Firebase path: `/users/{userId}/raffleTickets`
- Check existing raffle system uses same path
- View rep sync logs to confirm API call succeeded

## Performance Optimization

### Batch Rep Submissions (Optional)

For high-frequency rep submissions, batch multiple reps:

```javascript
// In hubSync.js
const repBatch = [];
const BATCH_SIZE = 5; // Send every 5 reps

function addRepToBatch(repData) {
  repBatch.push(repData);
  if (repBatch.length >= BATCH_SIZE) {
    sendBatchToHub();
  }
}
```

### Caching Recent Results

Add in-memory cache to avoid redundant Firebase writes:

```javascript
const recentWritesCache = new Map();

// Before Firebase write:
const cacheKey = `${userId}-${timestamp}`;
if (recentWritesCache.has(cacheKey)) {
  return; // Skip duplicate
}
recentWritesCache.set(cacheKey, true);
```

## Rollback Plan

If integration causes issues:

1. **Stop Hub API calls:** Remove hubSync.js import from sessionManager.js
2. **Live Server still works:** Game logic unaffected
3. **Existing data safe:** Firebase profiles unchanged
4. **Re-enable after fix:** Simply re-add import and redeploy

## Next Steps

1. ✅ Copy API route files to Vercel Hub
2. ✅ Set environment variables on both services
3. ✅ Test with a single rep submission
4. ✅ Monitor logs for successful sync
5. ✅ Verify Firebase profile updates
6. ✅ Run full game test (multiple players)
7. ✅ Monitor raffle ticket increments
8. ✅ Check leaderboard rankings update

## Support

If integration issues occur:

1. Check Vercel logs: `vercel logs --tail 50`
2. Check Live Server logs: `pm2 logs live-server`
3. Verify Firebase credentials in Vercel settings
4. Verify `HUB_API_SECRET` matches on both sides
5. Check Firebase security rules allow API writes
6. Test API directly: `curl -X POST https://your-hub.vercel.app/api/reps/completed -H "Authorization: Bearer secret" -d '{...}'`
