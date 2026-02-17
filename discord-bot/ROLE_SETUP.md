# Discord Bot Role Setup Guide

For the bot to assign milestone roles (permanent achievement roles based on lifetime wins), you need to configure permissions properly.

---

## 🔐 Required Bot Permissions

In your Discord Developer Portal → Bot → Privileged Gateway Intents:
- ✅ **Do NOT enable** "Message Content Intent" (not needed)
- ✅ **Do NOT enable** "Server Members Intent" (we fetch directly)
- ✅ **Do NOT enable** "Presence Intent" (not needed)

---

## 🛡️ Required Server Permissions

When inviting the bot to your server, include these permissions:

### Method 1: Generate Invite Link in Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your bot application
3. Go to **OAuth2 → URL Generator**
4. Check these **SCOPES**:
   - ✅ `bot`
5. Check these **BOT PERMISSIONS**:
   - ✅ **Manage Roles** (required to assign milestone roles)
   - ✅ **Manage Channels** (required to create/delete voice channels)
   - ✅ **View Channels**
   - ✅ **Send Messages** (for announcements)
   - ✅ **Embed Links** (for rich embeds)
6. Copy the generated URL at the bottom
7. Visit the URL to invite the bot

**Full permission integer: `268445712`**

### Method 2: Manual Invite URL

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=268445712&scope=bot
```

Replace `YOUR_BOT_CLIENT_ID` with your bot's Client ID from the Developer Portal.

---

## 📊 Role Hierarchy Setup (CRITICAL)

**The bot can only assign roles that are BELOW its own role in the hierarchy.**

### Steps:

1. **In your Discord server**, go to **Server Settings → Roles**
2. Find your bot's role (usually created automatically when bot joins)
3. **Drag the bot's role ABOVE all milestone roles**

Example hierarchy (top = highest power):
```
👑 Server Owner
🔧 Admin
🤖 Rivalis Live Bot  ← Bot's role (MUST BE HERE)
────────────────────────
💀 Ascended          ← Bot can manage these
🩶 Apex
👑 Champion
🏆 Elite
🧨 Dominator
🥊 Breaker
⚡ Enforcer
🔥 Burner
🩸 Rival
🟥 Spark             ← Bot can manage these
────────────────────────
👤 @everyone
```

**Why?** Discord's role hierarchy prevents bots from assigning roles equal to or higher than their own position.

**Note:** These are permanent milestone roles - they don't expire as long as the user stays active in the community.

---

## 🧪 Test Role Assignment

After setup, test with curl:

```bash
curl -X POST http://localhost:5000/announce-winner \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "winnerDiscordId": "YOUR_DISCORD_USER_ID",
    "winnerName": "TestWinner",
    "winnerScore": 1000,
    "exerciseName": "pushups",
    "totalReps": 50
  }'
```

**Expected response:**
```json
{
  "success": true,
  "announcement": "...",
  "roleGrant": {
    "granted": true,
    "roleName": "🟥 Spark",
    "totalWins": 1,
    "milestoneWins": 1,
    "isPermanent": true
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Missing Permissions"

**Cause:** Bot doesn't have "Manage Roles" permission

**Fix:**
1. Kick the bot from your server
2. Re-invite using the OAuth2 URL with correct permissions
3. Or manually grant "Manage Roles" in Server Settings → Roles → [Bot Role] → Permissions

---

### Error: "Missing Access"

**Cause:** Bot's role is not high enough in hierarchy

**Fix:**
1. Go to Server Settings → Roles
2. Drag bot's role ABOVE all milestone roles (Spark, Rival, Burner, etc.)
3. Test again

---

### Roles are not being assigned but no error

**Cause:** `winnerDiscordId` might be incorrect

**Fix:**
1. Enable Developer Mode in Discord: User Settings → Advanced → Developer Mode
2. Right-click the user → Copy ID
3. Use that ID as `winnerDiscordId` in your API call

---

### Roles not upgrading properly

**Cause:** Old milestone role not being removed

**Fix:**
1. Check bot has "Manage Roles" permission
2. Ensure bot's role is ABOVE all milestone roles in hierarchy
3. Manually remove old roles if needed
4. Test again with a new winner announcement

---

## 🎮 How Milestone Roles Work

**Permanent Achievement System:**

| Milestone | Wins Required | Role Name | Color |
|-----------|---------------|-----------|-------|
| 1st | 1 win | 🟥 Spark | Red |
| 2nd | 3 wins | 🩸 Rival | Crimson |
| 3rd | 5 wins | 🔥 Burner | Orange-Red |
| 4th | 8 wins | ⚡ Enforcer | Gold |
| 5th | 12 wins | 🥊 Breaker | Dark Orange |
| 6th | 18 wins | 🧨 Dominator | Tomato |
| 7th | 25 wins | 🏆 Elite | Goldenrod |
| 8th | 35 wins | 👑 Champion | Gold |
| 9th | 50 wins | 🩶 Apex | Silver |
| 10th | 75+ wins | 💀 Ascended | Dark Red |

**How it works:**
1. Each win increments lifetime win count in Firebase
2. Bot automatically upgrades role when new milestone reached
3. Old milestone role removed, new one assigned
4. **Roles are permanent** - they don't expire
5. Only the highest earned milestone role is active

**Data stored in Firebase:** `users/{discordId}/stats/lifetime`

---

## ✅ Checklist

- [ ] Bot has "Manage Roles" permission
- [ ] Bot has "Manage Channels" permission
- [ ] Bot's role is positioned ABOVE all milestone roles in hierarchy
- [ ] No privileged intents enabled in Developer Portal
- [ ] Tested role assignment with curl command
- [ ] First win grants 🟥 Spark role
- [ ] Roles upgrade automatically as users reach milestones
- [ ] Roles persist (don't expire)

---

## 📚 Related Files

- [bot.js](bot.js) - Main bot code with role logic
- [.env.example](.env.example) - Environment variables template
- [SETUP.md](SETUP.md) - General bot setup guide

---

Your bot should now be able to assign permanent milestone roles! 🎉
