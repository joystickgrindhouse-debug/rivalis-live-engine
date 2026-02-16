# Firebase Sync - Quick Reference Card

## 🚀 3-Step Deployment

### Step 1: Copy API Routes to Vercel Hub
```bash
# From this repo to your Vercel Hub project:
cp vercel-hub-api-routes/reps-completed.js  YOUR_HUB/pages/api/reps/completed.js
cp vercel-hub-api-routes/sessions-ended.js  YOUR_HUB/pages/api/sessions/ended.js
```

### Step 2: Set Environment Variables

**On Vercel Dashboard:**
```
FIREBASE_ADMIN_SDK = <copy entire firebase service account JSON>
FIREBASE_DATABASE_URL = https://your-project.firebaseio.com
HUB_API_SECRET = generate_random_secret_here_32_chars
```

**On Live Server in /live-server/.env:**
```
HUB_API_URL = https://your-hub-project.vercel.app
HUB_API_SECRET = generate_random_secret_here_32_chars
```

⚠️ **Both secrets MUST match exactly**

### Step 3: Deploy & Restart
```bash
# Vercel
cd your-hub-project
vercel deploy --prod

# Live Server (SSH into Termux)
pm2 restart live-server
pm2 logs live-server
```

---

## ✅ Verification Checklist

| Check | Expected | Where to Look |
|-------|----------|---------------|
| Rep submits | `[HubSync] Rep synced for userId` | Live Server logs |
| API receives | `[API] ✅ Rep synced for user` | Vercel functions logs |
| Firebase updates | `/users/{userId}/stats/totalReps` | Firebase Console |
| Raffle increments | `/users/{userId}/raffleTickets` | Firebase Console |
| Session ends | Session archived with leaderboard | `/sessionArchive/{sessionId}` |
| Hall of fame | Winner recorded | `/hallOfFame/{timestamp}-{sessionId}` |

---

## 📊 Data Payloads

### Rep Submission Payload
**Source:** Live Server → Vercel `POST /api/reps/completed`
```json
{
  "userId": "user123",
  "playerId": "player456",
  "exercise": "pushups",
  "repsAdded": 5,
  "scoreAdded": 450,
  "formScore": 0.92,
  "depth": 0.88,
  "timestamp": 1699564321000,
  "sessionId": "session789",
  "totalSessionReps": 25,
  "totalSessionScore": 3500
}
```

**Firebase Updates:**
- `/users/user123/stats/totalReps` += 5
- `/users/user123/stats/totalScore` += 450
- `/users/user123/raffleTickets` += 1
- `/leaderboards/allTime/user123/totalReps` += 5
- `/leaderboards/allTime/user123/totalScore` += 450

### Session End Payload
**Source:** Live Server → Vercel `POST /api/sessions/ended`
```json
{
  "sessionId": "session789",
  "winner": {
    "userId": "user123",
    "playerId": "player456",
    "finalReps": 45,
    "finalScore": 6750,
    "durationMs": 300000
  },
  "finalLeaderboard": [
    {"userId": "user123", "finalReps": 45, "finalScore": 6750, "placement": 1},
    {"userId": "user789", "finalReps": 38, "finalScore": 5200, "placement": 2}
  ],
  "endedAt": 1699564621000,
  "duration": 300000,
  "exerciseName": "pushups"
}
```

**Firebase Updates:**
- `/sessionArchive/session789/` saves full results
- `/hallOfFame/{timestamp}-session789/` records winner
- `/users/user123/stats/gamesWon` += 1
- `/leaderboards/placements/user123/firstPlace` += 1

---

## 🔐 Authentication

All API calls include Bearer token header:
```
Authorization: Bearer {HUB_API_SECRET}
```

Live Server validates with `process.env.HUB_API_SECRET`
Vercel validates with `process.env.HUB_API_SECRET`

If mismatch → 401 Unauthorized error

---

## 🐛 Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Check HUB_API_SECRET matches both services |
| Firebase writes fail | Verify FIREBASE_ADMIN_SDK in Vercel env |
| Reps not syncing | Check `hubSync` import in sessionManager.js line 8 |
| Raffle not incrementing | Verify `/users/{userId}/raffleTickets` path exists |
| Logs show nothing | Check HUB_API_URL set in Live Server .env |

See **FIREBASE_SYNC_SETUP.md** for detailed troubleshooting

---

## 📁 Files Reference

**Modified:**
- `live-server/game/sessionManager.js` - Added hubSync calls

**New API Routes (copy to Vercel Hub):**
- `vercel-hub-api-routes/reps-completed.js` → `pages/api/reps/completed.js`
- `vercel-hub-api-routes/sessions-ended.js` → `pages/api/sessions/ended.js`

**Documentation:**
- `FIREBASE_SYNC_SETUP.md` - Complete setup guide
- `FIREBASE_PROFILE_SYNC_INTEGRATION.md` - Full integration details
- `FIREBASE_SYNC_QUICK_REFERENCE.md` - This file

---

## 🧪 Test Commands

### Submit test rep (Live Server)
```bash
# Via WebSocket client - play a game and submit a rep
# Or manually POST to Live Server if debugging
curl -X POST http://localhost:8080/api/sessions/abc/submit-rep \
  -H "Content-Type: application/json" \
  -d '{"playerId":"p1","exercise":"pushups","reps":5}'
```

### Check Vercel logs
```bash
vercel logs --tail 50
vercel logs --grep "HubSync"
```

### Check Live Server logs
```bash
pm2 logs live-server --tail 50
pm2 logs live-server | grep HubSync
```

### Watch Firebase updates
```bash
# In Firebase Console:
# Database → realtime → Users → [userId] → stats
# Watch totalReps, totalScore, raffleTickets update in real-time
```

---

## 🎯 Success Criteria

After deployment:
- ✅ Rep submissions show sync logs
- ✅ Firebase totalReps increments
- ✅ Firebase raffleTickets increments by 1 per rep
- ✅ Session end creates archive + hall of fame entries
- ✅ Leaderboard rankings update
- ✅ Zero game performance impact

---

## 📞 Quick Support

**Verify configuration:**
```bash
# Live Server
echo $HUB_API_URL
echo $HUB_API_SECRET

# Vercel
vercel env list
```

**Enable debug mode on Live Server:**
```bash
# Add to .env
DEBUG_HUB_SYNC=true
pm2 restart live-server
pm2 logs live-server --tail 100
```

**Test API directly:**
```bash
curl -X POST https://your-hub.vercel.app/api/reps/completed \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"test",
    "playerId":"p1",
    "exercise":"pushups",
    "repsAdded":5,
    "scoreAdded":450,
    "formScore":0.9,
    "depth":0.88,
    "timestamp":1699564321000,
    "sessionId":"session123",
    "totalSessionReps":25,
    "totalSessionScore":3500
  }'
```

Expected response: `{"success":true,"message":"Rep recorded: +5 reps, +450 score, +1 raffle ticket","userId":"test"}`

---

**Last Updated:** 2024
**Status:** ✅ Ready for Deployment
