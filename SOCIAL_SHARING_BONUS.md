# Social Share Bonus System

## Overview
Share your match results on social media and earn **50 raffle tickets per platform**!

This feature encourages viral growth while rewarding community members who help promote Rivalis Live.

## How It Works

### 1. Generate Share Card (Discord)
```
!share <exercise> <reps> <score> <placement>
```

**Example:**
```
!share squats 50 1000 1
```

Response displays:
- 🥇 Your placement
- 💪 Exercise performed
- 📊 Reps completed
- 🎯 Score achieved
- 🎟️ **+50 raffle tickets per share**
- 🔗 Share links for each platform

### 2. Share to Social Media
Click any of the platform links:
- 🐦 **Twitter** - Automatic tweet with your stats
- 📘 **Facebook** - Post to your wall
- 💼 **LinkedIn** - Share professional achievement
- 🔗 **Reddit** - Post to fitness communities
- 📱 **TikTok** - Manual share (template provided)
- 📸 **Instagram** - Manual share (template provided)

### 3. Automatic Bonus
When you share, the system automatically:
- ✅ Awards **+50 raffle tickets**
- 📊 Logs the share for analytics
- 🎯 Tracks platform statistics
- 🎉 Sends you confirmation

## Raffle Ticket Scaling

**Combined with performance rewards:**

```
Base Tickets (Performance) = 1-5 tickets
Placement Bonus = 1-5 extra tickets
Share Bonus = +50 tickets per platform
```

**Example:**
- 1st place with 50 reps = 10 tickets
- Share to Twitter = +50 tickets
- Share to Instagram = +50 tickets
- **Total: 110 raffle tickets! 🎊**

## Sharing Platforms

### Twitter
- Auto-populated tweet
- Includes exercise, reps, score, placement
- Hashags: #RivalisLive #FitnessChallenge #WorkoutGoals
- Platform limit: Share as often as you want

### Instagram
```
Caption:
I crushed my fitness goals today! 💪

📊 [Exercise]
📊 [Reps] reps
🎯 [Score] points

#RivalisLive #FitnessChallenge #WorkoutGoals
#CompetitiveFitness #FitnessTech #ExerciseGaming
```

### TikTok
```
Caption: I just got [placement] in Rivalis Live!

Trending Sounds:
- Workout motivation
- Achievement unlocked
- Victory music

Hashtags:
#RivalisLive #FitnessChallenge #WorkoutChallenge
#CompetitiveFitness #FitnessTech #ExerciseTok
```

### Facebook
- Public share to your timeline
- Tag friends who work out
- Share in fitness groups

### LinkedIn
- Share professional fitness goals
- Network with health-conscious professionals
- Discuss competitive fitness trends

### Reddit
- r/fitness
- r/gainsclub
- r/homegym
- r/fitnessgaming

## Analytics Dashboard

**View total shares by platform:**
```
GET /share/stats
```

Returns:
```json
{
  "twitter": 245,
  "instagram": 189,
  "tiktok": 412,
  "facebook": 78,
  "linkedin": 123,
  "reddit": 95,
  "total": 1142,
  "totalTicketsAwarded": 57100
}
```

## User Share History

**View your share history:**
```
GET /share/history/:userId
```

Returns:
```json
{
  "shares": [
    {
      "id": "share-1234-abc",
      "exercise": "squats",
      "reps": 50,
      "score": 1000,
      "placement": 1,
      "platform": "twitter",
      "sharedAt": "2026-02-16T12:00:00Z",
      "raffleTickets": 50
    }
  ],
  "totalShares": 5
}
```

## Bonus Restrictions

- **One bonus per share** (share to multiple platforms = multiple bonuses)
- **No duplicate sharing** - Same match can be shared multiple times to different platforms
- **Verified shares only** - Share must be confirmed on the platform
- **Active communities only** - Share must be public and visible

## Integration with Rivalis Hub

**Display in user profile:**
- 📊 Total shares
- 🏆 Most shared exercise
- 💬 Share streak
- 🎟️ Raffle tickets from sharing

**Example profile:**
```
User: SmartFitness90
📊 Total Sessions: 45
🥇 Wins: 12
⭐ XP: 5,200
🎟️ Raffle Tickets: 450
📢 Total Shares: 8
  - Twitter: 3
  - Instagram: 2
  - TikTok: 2
  - Facebook: 1
```

## Discord Commands

```
!share <exercise> <reps> <score> <placement>
  Generate shareable match result

!share template
  View pre-made templates for each platform

!share history
  View your recent shares (coming soon)

!share stats
  View global sharing statistics
```

## FAQ

**Q: Can I share the same match multiple times?**
A: Yes! Share to different platforms to earn 50 tickets each.

**Q: Do I get raffle tickets if I share manually?**
A: Only if you use the Discord bot links or report the share via the API. This prevents fraud.

**Q: What if my share gets deleted?**
A: The ticket bonus remains. It's awarded when the share is confirmed.

**Q: Can I share other users' results?**
A: Not yet. Coming in v2.0 with "Challenge Friends" feature.

**Q: Do shares expire?**
A: No, raffle tickets don't expire and neither do shares.

**Q: What's the daily share limit?**
A: Unlimited! Share every match if you want.

## Virality Strategy

**Recommended sharing sequence:**

1. **Immediately after win** (1st place) → Twitter + Instagram
2. **Next day** → TikTok (algorithm boost from fresh content)
3. **Mid-week** → LinkedIn (professional audience)
4. **Weekend** → Reddit communities + Facebook groups

**Pro tip:** Different times on different platforms maximize reach:
- Twitter: 8-10am PT
- Instagram: 11am-1pm PT
- TikTok: 6-10pm PT
- LinkedIn: 8-9am PT
- Reddit: 12-1pm PT, 8-10pm PT

## Tracking Code

To track shares programmatically:

```javascript
// After user shares
const trackResponse = await fetch('http://localhost:5000/share/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shareId: 'share-abc123',
    platform: 'twitter',
    url: 'https://twitter.com/user/status/12345'
  })
});

const result = await trackResponse.json();
// { 
//   success: true,
//   message: "Share tracked on twitter! 🎉 +50 raffle tickets awarded!",
//   bonusTickets: 50
// }
```

## Future Enhancements

- 📱 Native share buttons in Hub
- 👥 Share friend challenges
- 🎥 Auto-generate short video clips
- 🏅 "Viral Master" achievement badge
- 💰 Leaderboard for most shares
- 🔗 Referral bonuses (50 tickets per new user)
