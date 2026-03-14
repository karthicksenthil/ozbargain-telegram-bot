# OzBargain Telegram Bot

A Node.js bot that monitors [OzBargain.com.au](https://www.ozbargain.com.au) in real-time and sends notifications to a Telegram channel whenever a deal reaches 50+ upvotes.

## ⚠️ Important: Two Versions Available

This bot comes in **two versions**:

### 1. RSS Version (RECOMMENDED - `ozbargain-bot-rss.js`)
✅ **Less likely to get blocked**  
✅ Uses official RSS feed  
✅ More polite and respectful  
⚠️ Slightly slower to detect deals  

### 2. Direct Scraping Version (`ozbargain-bot.js`)
⚠️ **May get 403 Forbidden errors**  
✅ Faster detection  
✅ More deal details  
❌ Higher risk of IP blocking  

**Default:** The Docker setup uses the RSS version by default.

> 💡 **Getting 403 errors?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for solutions.

## Features

- 🔍 Scrapes OzBargain homepage every minute
- 📢 Sends notifications to Telegram channel for deals with 50+ upvotes
- 🎯 Avoids duplicate notifications (tracks already-notified deals)
- 💰 Includes deal price, merchant, category, and upvote count
- 🔗 Direct links to deals
- 🧹 Automatic cleanup of old tracked posts

## Prerequisites

- Node.js (v14 or higher)
- A Telegram Bot Token (from @BotFather)
- A Telegram Channel (where notifications will be sent)

## Setup Instructions

### Option A: Docker (Recommended)

The easiest way to run the bot is using Docker.

#### Prerequisites
- Docker and Docker Compose installed
- A Telegram Bot Token (from @BotFather)
- A Telegram Channel

#### Quick Start

1. **Clone/download the project files**

2. **Configure environment variables**
```bash
cp .env.example .env
nano .env  # Edit with your credentials
```

3. **Build and run with Docker Compose**
```bash
docker-compose up -d
```

4. **Check logs**
```bash
docker-compose logs -f
```

5. **Stop the bot**
```bash
docker-compose down
```

#### Docker Commands

```bash
# Build the image
docker-compose build

# Start the bot in detached mode
docker-compose up -d

# View logs
docker-compose logs -f ozbargain-bot

# Restart the bot
docker-compose restart

# Stop and remove containers
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Option B: Manual Installation

If you prefer not to use Docker:

### Testing Your Setup

Before running the bot, test your configuration:

```bash
# Install dependencies first
npm install

# Run the diagnostic test
node test-bot.js
```

This will check:
- ✓ Environment variables are set
- ✓ Internet connectivity
- ✓ Telegram API is accessible
- ✓ Bot token is valid
- ✓ Channel permissions are correct
- ✓ OzBargain is accessible

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the instructions
3. Choose a name and username for your bot
4. Copy the **bot token** (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Create a Telegram Channel (for both options)

1. Create a new channel in Telegram
2. Add your bot as an administrator to the channel
3. For public channels: use `@yourchannel` as the channel ID
4. For private channels: 
   - Forward a message from your channel to [@userinfobot](https://t.me/userinfobot)
   - Copy the channel ID (looks like `-1001234567890`)

### 3. Install Dependencies (Manual Installation Only)

```bash
# Clone or download the project files
cd ozbargain-telegram-bot

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env

# Edit the .env file with your credentials
nano .env  # or use your preferred editor
```

### 4. Configure Environment Variables (Manual Installation Only)

Edit the `.env` file and add your credentials:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHANNEL_ID=@yourchannel
```

### 5. Run the Bot (Manual Installation Only)

```bash
# Start the bot
npm start

# Or for development with auto-restart
npm run dev
```

## Configuration

### Switching Between Versions

**With Docker:**

Edit `docker-compose.yml` and change the `command` line:

```yaml
# For RSS version (recommended)
command: ["node", "ozbargain-bot-rss.js"]

# For direct scraping version
command: ["node", "ozbargain-bot.js"]
```

Then restart:
```bash
docker-compose up -d --build
```

**Without Docker:**

```bash
# Run RSS version
npm start  # or: node ozbargain-bot-rss.js

# Run direct scraping version
node ozbargain-bot.js
```

### Customizing Settings

You can customize the bot behavior by editing these variables in `ozbargain-bot.js` or `ozbargain-bot-rss.js`:

```javascript
const CHECK_INTERVAL = 3600000;    // Check every 1 hour (in milliseconds)
const UPVOTE_THRESHOLD = 50;       // Notify when deals reach 50 upvotes

// RSS version only:
const POST_AGE_LIMIT = 24 * 60 * 60 * 1000;  // Only check deals from last 24 hours
```

**Common intervals:**
- 30 minutes: `1800000`
- 1 hour: `3600000` (default)
- 2 hours: `7200000`
- 6 hours: `21600000`

After changing, restart the bot:
```bash
docker-compose restart
```

## How It Works

1. **Scraping**: Every minute, the bot fetches the OzBargain homepage
2. **Parsing**: Extracts deal information including title, price, merchant, category, and upvotes
3. **Filtering**: Checks if any deals have reached the upvote threshold
4. **Notification**: Sends a formatted message to your Telegram channel for qualifying deals
5. **Tracking**: Remembers notified deals to prevent duplicates

## Notification Format

```
🔥 Hot Deal Alert! 🔥

Deal Title Here

💰 Price: $99.99
🏪 Store: Amazon AU
📁 Category: Electronics
👍 Upvotes: 52

🔗 View Deal
```

## Troubleshooting

### Bot can't send messages to channel
- Ensure the bot is added as an administrator to your channel
- Check that the channel ID is correct
- For private channels, make sure you're using the numeric ID (e.g., `-1001234567890`)

### No deals being detected
- Check your internet connection
- Verify OzBargain is accessible
- The site structure may have changed (check console logs for errors)

### Rate limiting or blocking
- The bot includes proper User-Agent headers
- If you get blocked, increase the `CHECK_INTERVAL` to reduce request frequency

## Running as a Service

### Using Docker (Already covered above)

If you're using Docker Compose, the bot runs as a service by default with `restart: unless-stopped` policy.

### Using PM2 (Recommended for manual installation)

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
pm2 start ozbargain-bot.js --name ozbargain-bot

# Make it start on system boot
pm2 startup
pm2 save

# Monitor logs
pm2 logs ozbargain-bot

# Stop the bot
pm2 stop ozbargain-bot
```

### Using systemd (Linux)

Create a service file at `/etc/systemd/system/ozbargain-bot.service`:

```ini
[Unit]
Description=OzBargain Telegram Bot
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/ozbargain-telegram-bot
ExecStart=/usr/bin/node ozbargain-bot.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl enable ozbargain-bot
sudo systemctl start ozbargain-bot
sudo systemctl status ozbargain-bot
```

## Dependencies

- **https** (built-in): Native Node.js HTTPS module - zero external HTTP libraries!
- **cheerio**: HTML/XML parsing and scraping (also used for RSS feed parsing)
- **dotenv**: Environment variable management

**That's it!** Only 2 npm packages needed. Everything else uses Node.js built-ins.

## Legal Notice

This bot is for personal use only. Please respect OzBargain's terms of service and robots.txt. Excessive scraping may result in IP blocking. Use responsibly.

## License

MIT License - feel free to modify and use as needed.

## Contributing

Feel free to submit issues or pull requests for improvements!
