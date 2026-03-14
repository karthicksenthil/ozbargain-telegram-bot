# Docker Deployment Guide

This guide covers deploying the OzBargain Telegram Bot using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Telegram Bot Token
- Telegram Channel ID

## Quick Start

1. **Clone the repository and navigate to the directory**
```bash
cd ozbargain-telegram-bot
```

2. **Create and configure your .env file**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHANNEL_ID=@yourchannel
```

3. **Start the bot**
```bash
docker-compose up -d
```

4. **Verify it's running**
```bash
docker-compose logs -f
```

You should see:
```
🤖 OzBargain Telegram Bot Started
📊 Settings:
   - Channel: @yourchannel
   - Upvote Threshold: 50
   - Check Interval: 60 seconds
```

## Docker Commands Reference

### Basic Operations

```bash
# Start the bot
docker-compose up -d

# Stop the bot
docker-compose down

# Restart the bot
docker-compose restart

# View real-time logs
docker-compose logs -f

# View last 100 log lines
docker-compose logs --tail 100
```

### Building and Updating

```bash
# Rebuild the image
docker-compose build

# Rebuild and restart (after code changes)
docker-compose up -d --build

# Pull latest base image and rebuild
docker-compose build --pull
```

### Maintenance

```bash
# Check container status
docker-compose ps

# Execute command inside container
docker-compose exec ozbargain-bot sh

# Remove stopped containers and images
docker-compose down --rmi all

# Remove everything including volumes
docker-compose down -v --rmi all
```

## Configuration

### Environment Variables

All configuration is done via the `.env` file:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHANNEL_ID=@yourchannel
```

### Resource Limits

The `docker-compose.yml` includes default resource limits:
- CPU: 0.5 cores (limit), 0.1 cores (reservation)
- Memory: 256MB (limit), 128MB (reservation)

You can adjust these in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

### Customizing Check Interval

To change how often the bot checks OzBargain, edit `ozbargain-bot.js`:

```javascript
const CHECK_INTERVAL = 120000;  // Check every 2 minutes
```

Then rebuild:
```bash
docker-compose up -d --build
```

## Deployment Scenarios

### Development

Run with real-time log output:
```bash
docker-compose up
```

### Production

Run detached with auto-restart:
```bash
docker-compose up -d
```

The bot will automatically restart if it crashes or if the server reboots.

### Multiple Environments

Create different compose files:

**docker-compose.prod.yml**
```yaml
version: '3.8'
services:
  ozbargain-bot:
    extends:
      file: docker-compose.yml
      service: ozbargain-bot
    env_file:
      - .env.prod
```

Run with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### View Logs

```bash
# Follow logs in real-time
docker-compose logs -f ozbargain-bot

# Search logs for errors
docker-compose logs | grep -i error

# Export logs to file
docker-compose logs > bot-logs.txt
```

### Container Health

```bash
# Check if container is running
docker-compose ps

# View container resource usage
docker stats ozbargain-bot

# Inspect container details
docker inspect ozbargain-telegram-bot
```

## Troubleshooting

### Bot not starting

1. Check logs:
```bash
docker-compose logs
```

2. Verify environment variables:
```bash
docker-compose config
```

3. Check if the container is running:
```bash
docker-compose ps
```

### Bot crashes or restarts frequently

1. Check memory usage:
```bash
docker stats ozbargain-bot
```

2. Increase memory limit in `docker-compose.yml`

3. Check application logs for errors:
```bash
docker-compose logs --tail 200
```

### Cannot connect to Telegram

1. Check network connectivity:
```bash
docker-compose exec ozbargain-bot wget -O- https://api.telegram.org
```

2. Verify bot token is correct

3. Ensure firewall allows outbound HTTPS

### Changes not taking effect

Always rebuild after code changes:
```bash
docker-compose up -d --build
```

## Advanced Configuration

### Using Docker Volumes for Persistence

If you want to persist the notified posts across restarts, modify `docker-compose.yml`:

```yaml
services:
  ozbargain-bot:
    # ... other config ...
    volumes:
      - ./data:/app/data
```

Then update `ozbargain-bot.js` to save/load from `/app/data/notified-posts.json`.

### Running Multiple Instances

To run multiple bots for different channels:

1. Create separate directories:
```bash
mkdir bot1 bot2
cp -r * bot1/
cp -r * bot2/
```

2. Configure different `.env` files in each directory

3. Run each separately:
```bash
cd bot1 && docker-compose up -d
cd ../bot2 && docker-compose up -d
```

### Custom Docker Network

```yaml
networks:
  bot-network:
    driver: bridge

services:
  ozbargain-bot:
    networks:
      - bot-network
```

## Security Best Practices

1. **Never commit .env file**
   - It contains sensitive credentials
   - Use `.env.example` as template

2. **Run as non-root user**
   - Already configured in Dockerfile
   - User ID: 1001

3. **Keep base image updated**
```bash
docker-compose build --pull
docker-compose up -d
```

4. **Limit container resources**
   - Prevents resource exhaustion
   - Already configured in docker-compose.yml

## Backup and Restore

### Backup Configuration

```bash
# Backup .env file
cp .env .env.backup

# Export container configuration
docker inspect ozbargain-telegram-bot > container-config.json
```

### Restore

```bash
# Restore .env
cp .env.backup .env

# Restart with backed up config
docker-compose up -d
```

## Uninstallation

To completely remove the bot:

```bash
# Stop and remove containers
docker-compose down

# Remove images
docker-compose down --rmi all

# Remove all data (optional)
rm -rf .env data/
```

## Support

For issues related to:
- **Docker setup**: Check Docker logs and ensure Docker daemon is running
- **Bot functionality**: Check application logs via `docker-compose logs`
- **Telegram connectivity**: Verify bot token and channel ID

## Updates

To update the bot to a new version:

```bash
# Pull new code
git pull  # or download new files

# Rebuild and restart
docker-compose up -d --build
```
