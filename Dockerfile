FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Clean install with exact versions (no package-lock)
RUN rm -f package-lock.json && \
    npm install --no-package-lock --loglevel verbose

# Copy application files
COPY ozbargain-bot.js ./
COPY ozbargain-bot-rss.js ./

# Create a non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default to RSS version (less likely to get blocked)
# Can be overridden in docker-compose.yml
CMD ["node", "ozbargain-bot-rss.js"]
