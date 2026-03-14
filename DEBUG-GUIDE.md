# Debugging Guide - Deals Not Being Sent

## Quick Diagnosis

Run these commands to see what's happening:

```bash
# View live logs with debugging
docker-compose logs -f ozbargain-bot

# You should see detailed output like:
# 🔍 Checking for 50+ upvotes...
#    Found 20 deals in RSS feed
#    Deal 12345: "Great TV Deal..." - 35 upvotes
#    ⏭️  Not enough upvotes (35/50)
```

## Common Issues

### 1. No Deals Have 50+ Upvotes

**Symptoms:**
```
Found 20 deals in RSS feed
0 deals have 50+ upvotes
⏭️  Not enough upvotes (35/50)
```

**Solution:** Lower the threshold temporarily to test:

Edit `docker-compose.yml` or the bot file:
```javascript
const UPVOTE_THRESHOLD = 10;  // Change from 50 to 10 for testing
```

Then restart:
```bash
docker-compose restart
```

### 2. Deals Already Notified

**Symptoms:**
```
⏭️  Already notified about deal 12345
```

**Solution:** The bot remembers deals it's already sent. To reset:

```bash
# Restart the bot (clears memory)
docker-compose restart

# Or rebuild completely
docker-compose down
docker-compose up -d
```

### 3. Message Send Failing

**Symptoms:**
```
📢 SENDING NOTIFICATION: Amazing Deal has 75 upvotes!
❌ Send failed: Bad Request: can't parse entities
```

**Solution:** Markdown parsing issue. The bot will show the exact error. Common fixes:
- Special characters in title
- URL formatting issues
- Check logs for the specific Telegram API error

### 4. Bot Token/Channel Issues

**Symptoms:**
```
❌ Telegram connection failed
❌ Channel test failed
```

**Solution:**
```bash
# Run diagnostics
docker-compose exec ozbargain-bot node test-bot.js

# Check environment variables
docker-compose exec ozbargain-bot env | grep TELEGRAM
```

## Check Current Deals

To see what's currently on OzBargain:

```bash
# Check RSS feed manually
curl https://www.ozbargain.com.au/deals/feed | grep -o '<title>[^<]*' | head -20

# Check website
curl -s https://www.ozbargain.com.au/ | grep -o 'nvb">[0-9]*' | head -20
```

## Enable Maximum Debugging

### Temporarily Lower Threshold

For testing, set threshold to 1:

```bash
# Edit the running container
docker-compose exec ozbargain-bot sh

# Then manually edit (or rebuild with changes)
```

Or easier - add to docker-compose.yml:
```yaml
services:
  ozbargain-bot:
    environment:
      - UPVOTE_THRESHOLD=10  # Lower for testing
```

### Force Immediate Check

```bash
# Restart to trigger immediate check
docker-compose restart

# Watch logs
docker-compose logs -f
```

## What You Should See (Working Bot)

```
🤖 OzBargain Bot (RSS Mode)
📊 Channel: @yourchannel
📊 Threshold: 50

🔐 Testing Telegram...
✓ Connected as @YourBot

📢 Testing channel...
✓ Test sent

📡 Fetching RSS...
✓ Found 20 deals
   Found 20 deals in RSS feed
  Checking: Amazing TV Deal 70% Off...
   Deal 12345: 75 upvotes (threshold: 50)
  📢 SENDING NOTIFICATION: Amazing TV Deal has 75 upvotes!
   → Preparing notification for: Amazing TV Deal
   → Message length: 234 chars
   → Sending to Telegram (attempt 1/3)...
✓ Successfully sent: Amazing TV Deal (75)
✓ Checked 20 deals, sent 1 notifications
```

## Test With Manual Message

Test if Telegram sending works at all:

```bash
# Get shell in container
docker-compose exec ozbargain-bot sh

# Send test message manually
node -e "
const https = require('https');
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL_ID;

const data = JSON.stringify({
  chat_id: CHANNEL,
  text: 'Test message from debug'
});

const req = https.request({
  hostname: 'api.telegram.org',
  path: '/bot' + TOKEN + '/sendMessage',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, res => {
  res.on('data', d => console.log(d.toString()));
});
req.write(data);
req.end();
"
```

## Still Not Working?

1. **Check logs carefully** - every step is now logged
2. **Verify threshold** - Maybe no deals have 50+ upvotes right now
3. **Test with low threshold** - Set to 10 or 5 temporarily
4. **Check bot permissions** - Must be admin in channel
5. **Run test script** - `docker-compose exec ozbargain-bot node test-bot.js`

## Get Help

When asking for help, provide:

```bash
# Full logs
docker-compose logs --tail 200 > bot-logs.txt

# Environment check
docker-compose exec ozbargain-bot env | grep TELEGRAM

# Test results
docker-compose exec ozbargain-bot node test-bot.js
```
