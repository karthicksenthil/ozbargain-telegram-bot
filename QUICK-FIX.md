# Quick Fix Reference Card

## 🚨 Common Issues & Fast Fixes

### Issue: "Cannot reach Telegram API" (but curl works)

**Problem:** DNS resolution issue in Node.js/Docker

**Fast Fix:**
```bash
# Option 1: With Docker
# Add to docker-compose.yml:
dns:
  - 8.8.8.8
  - 1.1.1.1

# Then:
docker-compose down && docker-compose up -d --build

# Option 2: Without Docker
sudo ./fix-dns.sh
```

---

### Issue: "403 Forbidden" from OzBargain

**Problem:** IP blocked from scraping

**Fast Fix:**
```bash
# Switch to RSS version (less aggressive)
# In docker-compose.yml, change:
command: ["node", "ozbargain-bot-rss.js"]

# Then:
docker-compose up -d --build
```

---

### Issue: "Cannot send messages to channel"

**Problem:** Bot not admin or wrong channel ID

**Fast Fix:**
```bash
# 1. Make bot admin in channel
# 2. Get channel ID:
#    - Public: @channelname
#    - Private: Forward message to @userinfobot
# 3. Update .env file
# 4. Restart bot
docker-compose restart
```

---

### Issue: "EFATAL: AggregateError"

**Problem:** Network/DNS/Firewall issue

**Fast Fix:**
```bash
# Run diagnostic
npm test

# Follow the specific error messages
# Usually DNS or firewall
```

---

### Issue: Bot crashes immediately

**Problem:** Missing env variables

**Fast Fix:**
```bash
# Check .env file exists
cat .env

# Should contain:
# TELEGRAM_BOT_TOKEN=your_token_here
# TELEGRAM_CHANNEL_ID=@yourchannel

# If missing:
cp .env.example .env
nano .env  # Edit with your values
```

---

## 🔧 Quick Commands

### Diagnose all issues
```bash
npm test
```

### Fix DNS
```bash
sudo ./fix-dns.sh
```

### View logs
```bash
docker-compose logs -f
```

### Restart bot
```bash
docker-compose restart
```

### Rebuild bot
```bash
docker-compose up -d --build
```

### Check bot status
```bash
docker-compose ps
```

### Test Telegram token
```bash
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

### Test DNS
```bash
nslookup api.telegram.org 8.8.8.8
```

---

## 📋 Pre-flight Checklist

Before running the bot:

- [ ] `.env` file created with valid credentials
- [ ] Bot added as admin to Telegram channel  
- [ ] DNS can resolve api.telegram.org
- [ ] Internet connection working
- [ ] Docker/Node.js installed
- [ ] Run `npm test` - all tests pass

---

## 🆘 Still Stuck?

1. Read full error in logs: `docker-compose logs`
2. Check TROUBLESHOOTING.md for detailed solutions
3. Run diagnostic: `npm test`
4. Check DNS: `./fix-dns.sh --check-only`

---

## 📞 Getting Help

When asking for help, provide:

```bash
# System info
uname -a
docker --version
node --version

# Logs
docker-compose logs --tail 50

# Test results
npm test

# DNS check
./fix-dns.sh --check-only

# Network test
curl -v https://api.telegram.org
nslookup api.telegram.org
```

This information helps diagnose issues faster!
