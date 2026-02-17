# Live Engine → Hub Integration Instructions

## Step 1: Copy Module Files to Hub

Create folder in Hub repo:
```
Hub-solo-broken-burnoutsnoauth/replit_integrations/live-engine-sync/
```

Copy these 2 files from `rivalis-live-engine/replit_integrations/live-engine-sync/`:
- `routes.js`
- `index.js`

---

## Step 2: Update Hub's server.js

### Add this import (around line 7, with other requires):

```javascript
const { registerLiveEngineSyncRoutes } = require("./replit_integrations/live-engine-sync");
```

### Add this registration (before `app.listen`, around line 600):

```javascript
registerLiveEngineSyncRoutes(app);
```

**Example of where to place it:**
```javascript
registerChatRoutes(app);
registerImageRoutes(app);
registerLiveEngineSyncRoutes(app);  // ← ADD THIS LINE

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## Step 3: Set Environment Variable in Vercel

1. Go to Vercel Dashboard
2. Select your Hub project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name:** `HUB_API_SECRET`
   - **Value:** (same secret you have in Live Server's .env)
5. Click "Add"
6. Redeploy your Hub

---

## Step 4: Commit and Deploy Hub

```bash
cd Hub-solo-broken-burnoutsnoauth
git add .
git commit -m "Add Live Engine sync integration"
git push
```

Vercel will auto-deploy.

---

## Step 5: Test It

1. Start Live Server on port 8080
2. Join a session and complete some reps
3. Check Firebase console:
   - `users/{userId}/stats/overview` → should see totalReps increase
   - `users/{userId}/gamification/raffle` → should see tickets increment
   - `leaderboards/allTime/users/{userId}` → should see stats update

---

## Verification

Check Vercel logs for:
```
[LiveEngineSync] Routes registered: /api/live-engine/reps/completed, /api/live-engine/sessions/ended
[LiveEngineSync] ✅ Rep synced for user abc123: +5 reps, +1 ticket
```

Done! ✅
