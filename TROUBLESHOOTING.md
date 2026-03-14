# Troubleshooting Guide - OzBargain Bot

## 403 Forbidden Errors

If you're getting "Request failed with status code 403", OzBargain is blocking your scraper requests. Here are solutions:

### Solution 1: Use the RSS-Based Version (Recommended)

The RSS version is more polite and less likely to get blocked:

**In docker-compose.yml**, change the CMD:
```yaml
services:
  ozbargain-bot:
    # ... other settings ...
    command: ["node", "ozbargain-bot-rss.js"]
```

Or if running manually:
```bash
node ozbargain-bot-rss.js
```

**Why it works better:**
- Uses official RSS feed (https://www.ozbargain.com.au/deals/feed)
- Only scrapes individual deal pages when needed
- Fewer requests = less likely to be blocked
- More respectful of their infrastructure

### Solution 2: Increase Check Interval

Reduce request frequency in `ozbargain-bot.js`:

```javascript
const CHECK_INTERVAL = 300000; // 5 minutes instead of 2
```

Or in `ozbargain-bot-rss.js`:
```javascript
const CHECK_INTERVAL = 180000; // 3 minutes
```

### Solution 3: Use a Proxy (Advanced)

Add proxy support to axios requests:

**Install proxy library:**
```bash
npm install https-proxy-agent
```

**Update the code:**
```javascript
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyAgent = new HttpsProxyAgent('http://your-proxy:port');

// In axios requests:
const response = await axios.get(url, {
  httpsAgent: proxyAgent,
  // ... other options
});
```

**Free proxy options:**
- Your own VPS with proxy
- Residential proxy services (paid)
- VPN on your server

### Solution 4: Add Docker Network Proxy

If using Docker, route through a proxy:

**docker-compose.yml:**
```yaml
services:
  ozbargain-bot:
    environment:
      - HTTP_PROXY=http://proxy-server:port
      - HTTPS_PROXY=http://proxy-server:port
```

### Solution 5: Run from Different IP

**Options:**
- Different cloud provider
- Home internet connection
- VPN service
- Mobile hotspot

### Solution 6: Respect robots.txt

Check what OzBargain allows:
```bash
curl https://www.ozbargain.com.au/robots.txt
```

Follow their rules and add appropriate delays.

## Other Common Issues

### "Curl works but bot can't reach Telegram API"

This is a DNS or Node.js networking issue. Even though `curl` works, Node.js/axios can't reach the API.

### Quick Diagnosis

Run the test script:
```bash
npm test
```

Or run the DNS fix helper:
```bash
./fix-dns.sh --check-only
```

### Common Causes

1. **DNS resolution issues in Node.js environment**
2. **IPv6/IPv4 routing problems**
3. **Missing CA certificates**
4. **Node.js using different DNS resolver than system**

### Solutions

#### Solution 1: Fix DNS in Docker (RECOMMENDED)

Update `docker-compose.yml`:
```yaml
services:
  ozbargain-bot:
    dns:
      - 8.8.8.8
      - 1.1.1.1
      - 8.8.4.4
    network_mode: bridge
```

Then rebuild:
```bash
docker-compose down
docker-compose up -d --build
```

#### Solution 2: Fix DNS on Host System

**Check current DNS:**
```bash
cat /etc/resolv.conf
```

**Add Google DNS:**
```bash
sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
sudo bash -c 'echo "nameserver 1.1.1.1" >> /etc/resolv.conf'
```

Or use the helper script:
```bash
sudo ./fix-dns.sh
```

#### Solution 3: Test DNS Resolution

```bash
# Test from command line
nslookup api.telegram.org

# Test with specific DNS server
nslookup api.telegram.org 8.8.8.8

# If this works, but the bot doesn't, it's a Node.js DNS issue
```

#### Solution 4: Use IP Address (Temporary Workaround)

This is NOT recommended for production, but can help diagnose:

Get Telegram API IP:
```bash
nslookup api.telegram.org 8.8.8.8
```

#### Solution 5: Check Node.js DNS Resolution

Create a test file `test-dns.js`:
```javascript
const dns = require('dns').promises;

(async () => {
  try {
    const result = await dns.resolve4('api.telegram.org');
    console.log('✓ Resolved:', result);
  } catch (error) {
    console.log('✗ Failed:', error.message);
  }
})();
```

Run it:
```bash
node test-dns.js
```

If this fails but `nslookup` works, you have a Node.js DNS configuration issue.

#### Solution 6: Alpine Linux DNS Issue (Docker)

If using Alpine-based Docker image and DNS fails:

```dockerfile
# Add to Dockerfile
RUN apk add --no-cache bind-tools
```

Or switch to Debian-based image:
```dockerfile
FROM node:18  # Instead of node:18-alpine
```

### After Fixing

1. Restart the bot:
```bash
docker-compose restart
```

2. Run the test:
```bash
npm test
```

3. Check logs:
```bash
docker-compose logs -f
```

## "EFATAL: AggregateError" when sending Telegram messages

This error typically means a network connectivity issue with Telegram's API.

**Fixes:**

1. **Check your bot token is valid:**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```
Should return bot information, not an error.

2. **Verify internet connectivity:**
```bash
ping api.telegram.org
```

3. **Check DNS resolution:**
```bash
nslookup api.telegram.org
```
If this fails, try changing DNS servers:
```bash
# Add to docker-compose.yml
services:
  ozbargain-bot:
    dns:
      - 8.8.8.8
      - 1.1.1.1
```

4. **Test from Docker container:**
```bash
docker-compose exec ozbargain-bot sh
wget -qO- https://api.telegram.org
```

5. **Firewall or proxy blocking Telegram:**
   - Check if your firewall blocks api.telegram.org
   - Some countries block Telegram - use a VPN
   - Corporate networks may block it

6. **Use environment variable troubleshooting:**
```bash
# Check if variables are set
docker-compose exec ozbargain-bot env | grep TELEGRAM
```

7. **IPv6 issues:**
If you're on IPv6-only network, Telegram might have connectivity issues:
```yaml
# In docker-compose.yml
services:
  ozbargain-bot:
    sysctls:
      - net.ipv6.conf.all.disable_ipv6=0
```

### "Cannot send messages to channel"

**Fixes:**
1. Ensure bot is admin in your channel
2. Check channel ID format:
   - Public: `@channelname`
   - Private: `-1001234567890`
3. Verify bot token is correct
4. Test with a simple message:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
     -d "chat_id=@yourchannel" \
     -d "text=Test"
   ```

### "No deals being detected"

**Checks:**
1. Verify OzBargain is accessible:
   ```bash
   curl -I https://www.ozbargain.com.au/
   ```
2. Check if site structure changed (selectors may be outdated)
3. Review logs for parsing errors
4. Test RSS feed:
   ```bash
   curl https://www.ozbargain.com.au/deals/feed
   ```

### "Bot keeps restarting"

**Debug steps:**
1. Check logs:
   ```bash
   docker-compose logs -f
   ```
2. Look for memory issues:
   ```bash
   docker stats ozbargain-bot
   ```
3. Verify environment variables are set:
   ```bash
   docker-compose config
   ```

### "Rate limiting (429 errors)"

**Solutions:**
1. Increase `CHECK_INTERVAL` significantly
2. Add random jitter to requests:
   ```javascript
   const jitter = Math.random() * 10000; // 0-10 seconds
   await sleep(MIN_REQUEST_INTERVAL + jitter);
   ```
3. Use RSS version (fewer requests)

### "Timeout errors (ECONNABORTED)"

**Fixes:**
1. Increase timeout in code:
   ```javascript
   const REQUEST_TIMEOUT = 30000; // 30 seconds
   ```
2. Check your internet connection
3. Try different DNS servers
4. Use a faster hosting provider

### "Module not found" errors

**Fix:**
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or with Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Performance Issues

### Bot uses too much memory

**Solutions:**
1. Limit cache size (already implemented)
2. Reduce `CHECK_INTERVAL`
3. Set Docker memory limits:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 128M
   ```

### Bot is slow

**Improvements:**
1. Use RSS version (fewer requests)
2. Reduce number of deals checked
3. Optimize selectors
4. Use faster DNS (1.1.1.1 or 8.8.8.8)

## Best Practices to Avoid Blocks

1. **Use RSS feed** - More polite and official
2. **Add delays** - Don't hammer the server
3. **Rotate user agents** - Appear more natural
4. **Respect robots.txt** - Follow their rules
5. **Cache results** - Don't re-check same deals
6. **Limit concurrent requests** - One at a time
7. **Use proper headers** - Look like a browser
8. **Handle errors gracefully** - Implement backoff
9. **Monitor your requests** - Don't go overboard
10. **Consider alternatives** - Maybe API or partnership?

## Testing

### Test without Docker

```bash
# Install dependencies
npm install

# Set environment variables
export TELEGRAM_BOT_TOKEN="your_token"
export TELEGRAM_CHANNEL_ID="@yourchannel"

# Run
node ozbargain-bot-rss.js
```

### Test scraping manually

```bash
# Test if you can access the site
curl -A "Mozilla/5.0" https://www.ozbargain.com.au/ | head -50

# Test RSS feed
curl https://www.ozbargain.com.au/deals/feed
```

### Test Telegram connectivity

```bash
# Test bot token
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

# Test sending message
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage" \
  -d "chat_id=@yourchannel" \
  -d "text=Test from bot"
```

## Getting Help

If you're still having issues:

1. **Check logs carefully** - Error messages contain clues
2. **Search the error** - Someone likely had the same issue
3. **Check OzBargain status** - Site might be down
4. **Test from different location** - IP might be blocked
5. **Consider alternatives** - Maybe scraping isn't the answer

## Legal and Ethical Considerations

- **Respect robots.txt** - Follow their scraping rules
- **Don't overload** - Be considerate of their servers
- **Check ToS** - Make sure scraping is allowed
- **Use official APIs** - If available, use those instead
- **Personal use only** - Don't commercialize scraped data
- **Be transparent** - Use descriptive User-Agent
- **Accept blocks** - They have the right to block scrapers

## Alternative Approaches

If scraping continues to be problematic:

1. **Manual checking** - Check site yourself periodically
2. **Browser extensions** - Use OzBargain browser tools
3. **Official apps** - Use their mobile app
4. **RSS readers** - Use Feedly or similar
5. **IFTTT/Zapier** - Use automation services
6. **Contact OzBargain** - Ask about official integrations

Remember: If a site is actively blocking you, it's a signal to reconsider your approach.
