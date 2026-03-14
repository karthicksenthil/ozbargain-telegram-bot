# Fix for "ReferenceError: File is not defined"

## The Issue

This error occurs when Node.js doesn't have proper fetch support or when using an incompatible Node.js version.

## Quick Fixes

### Fix 1: Rebuild with Updated Dockerfile (RECOMMENDED)

The updated Dockerfile now uses full Node 18 instead of Alpine:

```bash
# Stop and remove old containers
docker-compose down

# Rebuild with new Dockerfile
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

### Fix 2: Verify Node Version

Check you're using Node 18+:

```bash
# Inside container
docker-compose exec ozbargain-bot node --version

# Should show v18.x.x or higher
```

### Fix 3: Check Logs for Actual Error

```bash
docker-compose logs ozbargain-bot
```

Look for:
- `fetch is not available` - Node version too old
- `File is not defined` - Usually from rss-parser on old Node
- Other errors

## Why This Happens

1. **Node.js Version < 18** - fetch wasn't available
2. **Alpine Linux Issues** - Some Alpine builds had incomplete fetch
3. **rss-parser Compatibility** - Older Node versions cause issues

## What We Changed

### Before (Alpine):
```dockerfile
FROM node:18-alpine
```

### After (Full Debian):
```dockerfile
FROM node:18
```

Full Node.js image includes:
- ✅ Complete fetch implementation
- ✅ All standard APIs
- ✅ Better compatibility
- ✅ Easier debugging

## Testing the Fix

After rebuilding:

```bash
# Check bot starts
docker-compose logs -f

# You should see:
# 🤖 OzBargain Telegram Bot Started (RSS Mode)
# ✓ Connected as @YourBot
```

## Alternative: Use Node 20

For even better support, you can update to Node 20:

**Dockerfile:**
```dockerfile
FROM node:20
```

**Then rebuild:**
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Still Having Issues?

1. **Check Node version in container:**
```bash
docker-compose exec ozbargain-bot node --version
```

2. **Test fetch availability:**
```bash
docker-compose exec ozbargain-bot node -e "console.log(typeof fetch)"
# Should print: function
```

3. **Clean everything and start fresh:**
```bash
docker-compose down -v
docker system prune -f
docker-compose up -d --build
```

## Manual Installation (Without Docker)

If Docker continues to have issues:

```bash
# Install Node 18+ from nodejs.org
node --version  # Verify 18+

# Install dependencies
npm install

# Run directly
npm start
```

This bypasses Docker entirely and uses your system Node.js.
