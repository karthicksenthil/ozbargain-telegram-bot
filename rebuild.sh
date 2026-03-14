#!/bin/bash

echo "🔄 Rebuilding OzBargain Bot (Clean Install)"
echo "==========================================="
echo ""

# Stop and remove containers
echo "1️⃣  Stopping containers..."
docker-compose down

# Remove old images
echo "2️⃣  Removing old images..."
docker-compose down --rmi local

# Clean npm cache in case it's cached
echo "3️⃣  Cleaning Docker build cache..."
docker builder prune -f

# Rebuild from scratch
echo "4️⃣  Building fresh image (this may take a minute)..."
docker-compose build --no-cache --pull

# Start
echo "5️⃣  Starting bot..."
docker-compose up -d

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "Check logs:"
echo "  docker-compose logs -f"
echo ""
