# 🔗 Connect Termux Live Server to Vercel Hub

**Current Setup:**
- **Live Server:** Running in Termux (Android device) - `http://[your-device-ip]:8080`
- **Hub:** Deployed on Vercel - `https://[your-hub-project].vercel.app`
- **Communication:** HTTPS API with Bearer token authentication

---

## ⚠️ Critical: Do NOT Break This

The connection uses **Bearer token authentication** to prevent unauthorized requests. Both servers must:
1. Use the **same** `HUB_API_SECRET` value
2. Have matching HTTP headers and endpoint paths
3. Validate all incoming requests

---

## Step 1: Get Your Hub Vercel URL

**Your Hub Vercel URL should look like:**
```
https://your-hub-project.vercel.app
```

If you don't know your Hub URL:
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find your Hub project
3. Copy the **Domain** (it says "Production" next to it)

**Write it down:**
```
Hub URL: ___________________________
```

---

## Step 2: Shared Secret (HUB_API_SECRET)

A secret is already generated in your workspace:

**File:** [API_SECRET.txt](API_SECRET.txt)

```
HUB_API_SECRET=a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5
```

This token must be set in:
- ✅ **Vercel Hub** - Environment variables
- ✅ **Termux Live Server** - `.env` file

---

## Step 3: Configure Vercel Hub Environment Variables

### On Vercel Dashboard:

1. Go to your Hub project → **Settings** → **Environment Variables**
2. Click **Add new**
3. Add these 2 variables:

| Name | Value | Example |
|------|-------|---------|
| `HUB_API_SECRET` | Your shared secret from Step 2 | `a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5` |
| `FIREBASE_ADMIN_SDK` | Your Firebase Admin SDK JSON | (already configured) |

4. **Deploy** changes (Vercel will automatically redeploy)

### Via Vercel CLI:

```bash
# Install Vercel CLI if you don't have it
npm install -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add HUB_API_SECRET
# Paste: a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5

# Deploy
vercel deploy --prod
```

---

## Step 4: Add Files to Your Hub Repository

### You need to add these files to your Hub project:

1. **[HUB_FILE_1_routes.js](HUB_FILE_1_routes.js)** → Copy to:
   - `/api/live-engine-sync.js` OR
   - `/routes/liveEngineSync.js` OR
   - Wherever your Hub routes are

2. **[live-server/config/socialImages.js](live-server/config/socialImages.js)** → Copy to:
   - `/lib/socialImages.js` OR
   - `/config/socialImages.js`

3. Integrate into your Hub's main Express app:

```javascript
// In your Hub's main server file (index.js or server.js)
const { registerLiveEngineSyncRoutes } = require('./routes/liveEngineSync');

app.use('/api', registerLiveEngineSyncRoutes);
```

---

## Step 5: Configure Termux Live Server

### Create/Update `.env` file in Live Server:

**Location:** `/workspaces/rivalis-live-engine/live-server/.env` (on Termux)

**Add these lines:**

```bash
# Hub Connection
HUB_API_URL=https://your-hub-project.vercel.app
HUB_API_SECRET=a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5

# Firebase (existing config)
FIREBASE_ADMIN_SDK={...your existing config...}
```

### Quick Setup Command for Termux:

```bash
cd /workspaces/rivalis-live-engine/live-server

# Create .env file
cat > .env << 'EOF'
HUB_API_URL=https://your-hub-project.vercel.app
HUB_API_SECRET=a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5
FIREBASE_ADMIN_SDK={"type":"service_account","project_id":"...","key_id":"..."}
EOF

# Verify it was created
cat .env
```

---

## Step 6: Test the Connection

### From your Termux Live Server:

```bash
# Check that env variables are loaded
cd /workspaces/rivalis-live-engine/live-server
node -e "console.log('HUB_API_URL:', process.env.HUB_API_URL); console.log('HUB_API_SECRET:', process.env.HUB_API_SECRET ? 'SET ✓' : 'MISSING ✗')"
```

You should see:
```
HUB_API_URL: https://your-hub-project.vercel.app
HUB_API_SECRET: SET ✓
```

### Test API Endpoint from Terminal:

```bash
# Make a test request to your Hub
curl -X POST https://your-hub-project.vercel.app/api/live-engine/reps/completed \
  -H "Authorization: Bearer a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "playerId": "test-player",
    "exercise": "pushups",
    "repsAdded": 10,
    "scoreAdded": 50,
    "formScore": 95,
    "depth": 0.85,
    "timestamp": 1234567890,
    "sessionId": "test-session",
    "totalSessionReps": 10,
    "totalSessionScore": 50
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Rep recorded: +10 reps, +50 score, +1 raffle ticket",
  "userId": "test-user"
}
```

**If you get `401 Unauthorized`:**
- ❌ Check if `HUB_API_SECRET` is set correctly on Vercel
- ❌ Check if the Bearer token in curl matches the Vercel env variable
- ❌ Make sure Vercel deployed after adding env vars

---

## Step 7: Start the Live Server

```bash
cd /workspaces/rivalis-live-engine/live-server
npm install  # If not already done
npm start
```

**Check the logs for:**
```
✓ HubSync configured: HUB_API_URL loaded
✓ Server listening on http://localhost:8080
✓ Socket connections ready
```

---

## Network Flow (What's Actually Happening)

```
┌─────────────────┐
│  Live Server    │
│   (Termux)      │
│ :8080           │
└────────┬────────┘
         │
         │ HTTPS POST
         │ /api/live-engine/reps/completed
         │ Authorization: Bearer <token>
         │ 
         ▼
┌─────────────────┐
│  Hub (Vercel)   │
│  Validates      │
│  Bearer token   │
│  (HUB_API_SECRET)
└────────┬────────┘
         │
         │ Firebase
         │ Write data
         │
         ▼
    ┌────────┐
    │Firebase│
    │Firestore
    └────────┘
```

---

## Environment Variables Checklist

### ✓ Vercel Hub Must Have:

- [ ] `HUB_API_SECRET` = `a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5`
- [ ] `FIREBASE_ADMIN_SDK` = (your Firebase credentials)
- [ ] **Deployed** ✓ (changes were deployed after adding env vars)

### ✓ Termux Live Server `.env` Must Have:

- [ ] `HUB_API_URL` = `https://your-hub-project.vercel.app`
- [ ] `HUB_API_SECRET` = `a7f3d8c9e2b1f4a6d8c7e9f2a3b5d7e8c9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5`
- [ ] `FIREBASE_ADMIN_SDK` = (your Firebase credentials)

---

## Troubleshooting

### Problem: `401 Unauthorized` from Vercel

**Solution:**
```bash
# On Vercel Dashboard:
# 1. Go to Settings → Environment Variables
# 2. Check HUB_API_SECRET value exactly matches API_SECRET.txt
# 3. Redeploy the project (click "Deploy" button)
# 4. Wait 30 seconds for deployment to complete

# On Terminal, verify:
vercel env list | grep HUB_API_SECRET
```

### Problem: `HUB_API_URL not configured` in Live Server logs

**Solution:**
```bash
# Check .env file exists:
cat /workspaces/rivalis-live-engine/live-server/.env

# If missing or wrong:
nano /workspaces/rivalis-live-engine/live-server/.env
# Edit and save, then restart server
```

### Problem: `ENOTFOUND` (can't connect to Hub URL)

**Solution:**
```bash
# Test if Hub is reachable:
curl -I https://your-hub-project.vercel.app

# Should respond with 200 status
# If it fails, verify:
# 1. URL is correct (no typos)
# 2. Hub is deployed on Vercel (check dashboard)
# 3. Your internet connection works
```

### Problem: Session data not syncing to Firebase

**Solution:**
```bash
# 1. Check Live Server is running:
ps aux | grep "npm start"

# 2. Check logs for errors:
npm start  # This will show logs if running in foreground

# 3. If you see "HubSync] Rep synced" → Connection is working ✓
# 4. If no logs about HubSync → Check .env file has HUB_API_URL
```

---

## What's Connected Now

| Component | Connection | Status |
|-----------|-----------|--------|
| Live Server → Vercel | HTTPS with Bearer token | ✓ Ready |
| Rep submissions | POST /api/live-engine/reps/completed | ✓ Configured |
| Session end | POST /api/live-engine/sessions/ended | ✓ Configured |
| Social share bonus | POST /api/live-engine/share-bonus | ✓ Configured |
| Results page | GET /api/session/:sessionId | ✓ Configured |
| Game modes | Server-aware (5 modes) | ✓ Integrated |
| Social images | Random selection with results | ✓ Integrated |
| Raffle tickets | +1 per rep, +100 for share | ✓ Configured |

---

## Next Steps

1. ✅ Set `HUB_API_SECRET` on Vercel
2. ✅ Deploy Vercel project
3. ✅ Create `.env` on Termux Live Server
4. ✅ Test connection with curl command
5. ✅ Start Live Server
6. ✅ Create a test game session and verify data flows to Firebase

**It should "just work" after these steps without breaking anything.**
