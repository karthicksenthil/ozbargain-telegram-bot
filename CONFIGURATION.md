# Bot Configuration Summary

## Current Settings

### ⏰ Check Frequency
- **Interval:** 1 hour (3600000 milliseconds)
- **First check:** Immediately on startup
- **Subsequent checks:** Every 60 minutes

### 📅 Post Age Filter
- **Time window:** Last 24 hours only
- **Older posts:** Automatically skipped
- **Benefit:** Focuses on recent deals, reduces unnecessary checks

### 👍 Upvote Threshold
- **Minimum:** 50 upvotes
- **Behavior:** Only notifies when deals hit or exceed 50 upvotes
- **Tracking:** Remembers notified deals to avoid duplicates

## How It Works

### Hourly Check Cycle

```
Hour 0 (Startup):
  ↓
  Check all deals from last 24 hours
  ↓
  Send notifications for deals with 50+ upvotes
  ↓
  Wait 60 minutes
  ↓
Hour 1:
  ↓
  Check again
  ↓
  (repeat)
```

### 24-Hour Window Example

```
Current Time: 3:00 PM Friday

Bot will check deals posted between:
├── 3:00 PM Thursday (24h ago)
└── 3:00 PM Friday (now)

Deals posted before 3:00 PM Thursday are ignored.
```

## Adjusting Settings

### Change Check Frequency

Edit the bot file (`ozbargain-bot-rss.js` or `ozbargain-bot.js`):

```javascript
// Every 30 minutes
const CHECK_INTERVAL = 1800000;

// Every 2 hours
const CHECK_INTERVAL = 7200000;

// Every 15 minutes
const CHECK_INTERVAL = 900000;

// Every 6 hours
const CHECK_INTERVAL = 21600000;
```

Then rebuild:
```bash
docker-compose up -d --build
```

### Change Post Age Limit

Edit `ozbargain-bot-rss.js`:

```javascript
// Last 12 hours
const POST_AGE_LIMIT = 12 * 60 * 60 * 1000;

// Last 48 hours
const POST_AGE_LIMIT = 48 * 60 * 60 * 1000;

// Last 6 hours
const POST_AGE_LIMIT = 6 * 60 * 60 * 1000;
```

### Change Upvote Threshold

```javascript
// More notifications (lower threshold)
const UPVOTE_THRESHOLD = 25;

// Fewer notifications (higher threshold)
const UPVOTE_THRESHOLD = 100;

// For testing (very low)
const UPVOTE_THRESHOLD = 5;
```

## Performance Impact

### Current Settings (1 hour / 24 hours):
- ✅ Low server load
- ✅ Reasonable notification frequency
- ✅ Good battery usage (if on mobile)
- ✅ Respects OzBargain's servers
- ⚠️ May miss very short-lived deals

### More Frequent (15 min / 24 hours):
- ⚠️ Higher server load
- ✅ Catches deals faster
- ⚠️ More API requests
- ⚠️ Risk of rate limiting

### Less Frequent (6 hours / 48 hours):
- ✅ Very low server load
- ⚠️ Might miss deals
- ✅ Minimal API requests
- ⚠️ Less timely notifications

## Recommended Configurations

### For Active Deal Hunting
```javascript
const CHECK_INTERVAL = 900000;        // 15 minutes
const UPVOTE_THRESHOLD = 25;          // Lower threshold
const POST_AGE_LIMIT = 12 * 60 * 60 * 1000;  // 12 hours
```

### For Popular Deals Only
```javascript
const CHECK_INTERVAL = 3600000;       // 1 hour (current)
const UPVOTE_THRESHOLD = 100;         // High threshold
const POST_AGE_LIMIT = 24 * 60 * 60 * 1000;  // 24 hours (current)
```

### For Testing
```javascript
const CHECK_INTERVAL = 300000;        // 5 minutes
const UPVOTE_THRESHOLD = 5;           // Very low
const POST_AGE_LIMIT = 6 * 60 * 60 * 1000;   // 6 hours
```

### For Low Bandwidth / Battery
```javascript
const CHECK_INTERVAL = 21600000;      // 6 hours
const UPVOTE_THRESHOLD = 50;          // Standard (current)
const POST_AGE_LIMIT = 48 * 60 * 60 * 1000;  // 48 hours
```

## Environment Variable Override (Future)

You could modify the bot to accept environment variables:

```javascript
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL_MS) || 3600000;
const UPVOTE_THRESHOLD = parseInt(process.env.UPVOTE_THRESHOLD) || 50;
```

Then in `.env`:
```
CHECK_INTERVAL_MS=1800000
UPVOTE_THRESHOLD=25
```

This allows changing settings without editing code!

## Monitoring

### Check Current Settings

```bash
# View logs on startup
docker-compose logs ozbargain-bot | grep "Settings"

# Should show:
# 📊 Channel: @yourchannel
# 📊 Threshold: 50
# 📊 Check Interval: 3600 seconds (1 hour)
```

### Verify Timing

```bash
# Watch logs
docker-compose logs -f

# You'll see checks every hour:
# [14:00] 🔍 Checking for 50+ upvotes...
# [15:00] 🔍 Checking for 50+ upvotes...
# [16:00] 🔍 Checking for 50+ upvotes...
```

## FAQ

**Q: Why 1 hour instead of real-time?**
A: Balances timeliness with server load. Most hot deals stay popular for hours.

**Q: Will I miss deals posted between checks?**
A: No - each check looks at ALL deals from the last 24 hours, not just new ones.

**Q: Can I check every minute?**
A: Technically yes, but not recommended. Risk of rate limiting and banning.

**Q: What happens if the bot is offline?**
A: When it restarts, it checks the last 24 hours, so you won't miss much.

**Q: Why filter by 24 hours?**
A: Older deals are less likely to be useful, and checking them wastes resources.
