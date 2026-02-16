# Server.js Integration Guide for Rivalis Hub

## Step 1: Copy the Live Engine Sync Module

Copy the entire folder from rivalis-live-engine to your rivalis-hub project:

```bash
cp -r /workspaces/rivalis-live-engine/replit_integrations/live-engine-sync \
      YOUR_HUB_PROJECT/replit_integrations/live-engine-sync
```

## Step 2: Update server.js

In your **rivalis-hub** `server.js`, add the import and registration:

### Location: Near the top with other imports (around line 5-10)

Add this import:
```javascript
const { registerLiveEngineSyncRoutes } = require("./replit_integrations/live-engine-sync");
```

### Location: In the route registration section (after registerChatRoutes, around line ~250)

Add this registration:
```javascript
registerLiveEngineSyncRoutes(app);
```

## Full Context Example

Your `server.js` should look like:

```javascript
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');

const { registerChatRoutes } = require("./replit_integrations/chat");
const { registerImageRoutes } = require("./replit_integrations/image");
const { registerLiveEngineSyncRoutes } = require("./replit_integrations/live-engine-sync"); // ← ADD THIS
const { WebhookHandlers } = require("./stripe/webhookHandlers");
// ... rest of imports

const app = express();
app.use(cors());

// ... other setup code ...

// Register all routes
registerChatRoutes(app);
registerImageRoutes(app);
registerLiveEngineSyncRoutes(app); // ← ADD THIS
registerObjectStorageRoutes(app);

// ... rest of server code ...
```

## Step 3: Set Environment Variables

In your Vercel project settings, add/update:

```
HUB_API_SECRET = your-random-secret-key-here
```

This must match the `HUB_API_SECRET` on your Live Server `.env`:
```
HUB_API_URL=https://your-hub.vercel.app
HUB_API_SECRET=your-random-secret-key-here
```

## Step 4: Update Live Server hubSync.js

Update the `HUB_API_URL` in your hubSync.js to use the new endpoint paths:

Change:
```javascript
'/api/reps/completed'
'/api/sessions/ended'
```

To:
```javascript
'/api/live-engine/reps/completed'
'/api/live-engine/sessions/ended'
```

Or update in [live-server/utils/hubSync.js](../../live-server/utils/hubSync.js) lines ~35 and ~50:

```javascript
// Line ~35
postToHub('/api/live-engine/reps/completed', payload)

// Line ~50
postToHub('/api/live-engine/sessions/ended', payload)
```

## Step 5: Deploy

```bash
# In your rivalis-hub project
git add .
git commit -m "Add Live Engine Firebase sync routes"
vercel deploy --prod
```

## Verification

After deployment, check Vercel logs:

```bash
vercel logs --grep "LiveEngineSync"
```

Should show:
```
[LiveEngineSync] Routes registered: /api/live-engine/reps/completed, /api/live-engine/sessions/ended
```

When a rep is submitted:
```
[LiveEngineSync] ✅ Rep synced for user userId: +5 reps, +1 ticket
```

---

**Files Ready to Copy:**
- `/replit_integrations/live-engine-sync/routes.js` - Main logic
- `/replit_integrations/live-engine-sync/index.js` - Module export

Both files follow your existing Express.js pattern!
