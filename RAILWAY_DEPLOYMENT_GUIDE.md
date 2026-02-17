# Railway Deployment (Permanent Cloud Hosting)

Railway gives you a permanent URL without Termux complications.

## Step 1: Install Railway CLI (On Your Computer, NOT Termux)

```bash
npm install -g @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This opens your browser to authenticate.

## Step 3: Deploy Live Server

```bash
cd /workspaces/rivalis-live-engine/live-server
railway init
railway up
```

Railway will:
- Create a new project
- Deploy your Live Server
- Give you a URL like: `https://rivalis-live-production.up.railway.app`

## Step 4: Set Environment Variables on Railway

```bash
railway variables set HUB_API_URL=https://your-hub.vercel.app
railway variables set HUB_API_SECRET=your_hub_api_secret_here
railway variables set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

## Step 5: Test

Visit: `https://your-railway-url.up.railway.app/lobby-preview.html`

---

## Pricing

**Free Tier:**
- $5 credit per month
- Enough for 500 hours of uptime
- Perfect for testing and small games

**Paid (if needed):**
- $5/month minimum
- Pay only for what you use

---

## Why Railway > Termux?

✅ **Permanent URL** (doesn't change)
✅ **Always online** (doesn't need your phone)
✅ **Auto-restarts** on crashes
✅ **Logs & monitoring** built-in
✅ **No Android platform issues**

---

## Alternative: Render.com (Also Free)

1. Push code to GitHub
2. Go to https://render.com
3. Click "New Web Service"
4. Connect GitHub repo `rivalis-live-engine`
5. Set root directory: `live-server`
6. Build: `npm install`
7. Start: `npm start`
8. Add environment variables
9. Deploy!

You get: `https://rivalis-live.onrender.com`

---

**Which do you prefer?**
- **Serveo SSH tunnel** (quick test on Termux)
- **Railway** (best for production)
- **Render** (also good for production, free tier)
