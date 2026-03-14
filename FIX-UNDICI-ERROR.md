# Fix: "File is not defined" - Undici Error

## The Problem

```
ReferenceError: File is not defined
at Object.<anonymous> (/app/node_modules/undici/lib/web/webidl/index.js:537:48)
```

This happens when a dependency (like cheerio) pulls in `undici` which expects browser APIs.

## Quick Fix

Run the rebuild script:

```bash
./rebuild.sh
```

This will:
1. Stop the bot
2. Remove old Docker images
3. Clean build cache
4. Rebuild from scratch with correct dependencies
5. Start fresh

## Manual Fix

If the script doesn't work:

```bash
# Stop everything
docker-compose down

# Remove ALL related images and volumes
docker-compose down -v --rmi all

# Clean Docker cache
docker system prune -f

# Rebuild with no cache
docker-compose build --no-cache --pull

# Start fresh
docker-compose up -d
```

## What We Fixed

**Updated package.json:**
```json
{
  "dependencies": {
    "cheerio": "1.0.0-rc.5",  // Older stable version without undici
    "dotenv": "^16.3.1"
  }
}
```

**Updated Dockerfile:**
- Uses clean npm install (not npm ci)
- Removes package-lock.json
- Forces exact versions

## Verify It's Fixed

```bash
# Check logs
docker-compose logs

# Should see:
# 🤖 OzBargain Bot (RSS Mode)
# ✓ Connected as @YourBot

# NOT:
# ReferenceError: File is not defined
```

## Still Getting the Error?

### Option 1: Delete node_modules locally

```bash
# If you have node_modules on your host
rm -rf node_modules package-lock.json

# Then rebuild
./rebuild.sh
```

### Option 2: Use Node 20

Try upgrading to Node 20 which has better compatibility:

**Update Dockerfile:**
```dockerfile
FROM node:20  # Instead of node:18
```

Then rebuild:
```bash
./rebuild.sh
```

### Option 3: Manual npm install test

Test if dependencies install correctly:

```bash
# Enter container
docker-compose run --rm ozbargain-bot sh

# Inside container
rm -rf node_modules package-lock.json
npm install
node -e "console.log('Test OK')"

# If this works, exit and rebuild:
exit
./rebuild.sh
```

## Why This Happens

1. **cheerio rc.12** pulls in `undici` as a dependency
2. **undici** expects browser APIs like `File`
3. **Node.js** doesn't have these by default
4. **Result**: Error on startup

## Prevention

The package.json now uses:
- `cheerio@1.0.0-rc.5` - Stable, no undici
- Exact version (no `^` or `~`)
- No package-lock.json in Docker

This ensures consistent, working builds every time.

## Success Indicators

After fix, you should see:

```
🤖 OzBargain Bot (RSS Mode)
📊 Channel: @yourchannel
📊 Threshold: 50 upvotes
⏰ Check Interval: 60 minutes (1 hour)
📅 Post Age Limit: 24 hours

🔐 Testing Telegram...
✓ Connected as @YourBot

📢 Testing channel...
✓ Test sent

📡 Fetching RSS...
✓ Found 20 deals
```

No errors about `File is not defined`!
