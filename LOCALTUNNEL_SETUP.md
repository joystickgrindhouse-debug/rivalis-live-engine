# No Ngrok? Use Localtunnel Instead (Much Easier)

Localtunnel is a simpler alternative that works great on Termux and requires no installation!

## **Step 1: Install Localtunnel**

Run on Termux:

```bash
npm install -g localtunnel
```

That's it! No complex apt dependencies.

## **Step 2: Start Your Live Server**

Terminal 1 - Run Live Server:
```bash
cd /workspaces/rivalis-live-engine/live-server
npm start
```

## **Step 3: Start Tunnel**

Terminal 2 - Run tunnel:
```bash
lt --port 8080 --subdomain rivalis
```

You'll get output like:
```
your url is: https://rivalis.loca.lt
```

## **Step 4: Test Remotely**

From ANY device:
```
https://rivalis.loca.lt/lobby-preview.html
```

Should load! ✅

---

## **Advantages over Ngrok:**

✅ **Free tier is unlimited**
✅ **Easy setup on Termux** (just npm)
✅ **Subdomain persists** (rivalis.loca.lt stays the same)
✅ **Better for Termux** (npm-based, no system dependencies)

---

## **If Localtunnel Subdomain Already Taken**

Try a different subdomain:
```bash
lt --port 8080 --subdomain rivalis-live-dev-2024
```

Or use random subdomain:
```bash
lt --port 8080
```
(URL changes each time, but works)

---

## **Update Hub Configuration**

In your Hub config or environment variables:
```bash
LIVE_SERVER_URL=https://rivalis.loca.lt
```

Then all API calls will use the tunnel URL!

---

## **Troubleshooting**

**"Subdomain already taken"**
→ Use a different subdomain name

**"Cannot connect to tunnel"**
→ Make sure Live Server is running on port 8080

**"Tunnel disconnects"**
→ Terminal closed, run `lt --port 8080 --subdomain rivalis` again

---

Try this - much simpler than Ngrok! Let me know if it works!
