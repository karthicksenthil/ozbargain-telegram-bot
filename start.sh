#!/bin/bash

# OzBargain Telegram Bot - Quick Start Script
# This script helps you set up and run the bot quickly

set -e

echo "🤖 OzBargain Telegram Bot - Quick Setup"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker is installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: You need to configure your .env file!"
    echo ""
    echo "Please edit the .env file and add:"
    echo "  1. Your Telegram Bot Token (from @BotFather)"
    echo "  2. Your Telegram Channel ID"
    echo ""
    read -p "Press Enter to open .env file in your default editor..."
    
    if command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    elif command -v vi &> /dev/null; then
        vi .env
    else
        echo "Please manually edit the .env file with your credentials"
        exit 1
    fi
else
    echo "✓ .env file already exists"
    echo ""
    read -p "Do you want to edit the .env file? (y/N): " edit_env
    if [[ $edit_env =~ ^[Yy]$ ]]; then
        if command -v nano &> /dev/null; then
            nano .env
        elif command -v vim &> /dev/null; then
            vim .env
        elif command -v vi &> /dev/null; then
            vi .env
        else
            echo "Please manually edit the .env file"
            exit 1
        fi
    fi
fi

echo ""
echo "🔨 Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting the bot..."
docker-compose up -d

echo ""
echo "✓ Bot is starting!"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop the bot:"
echo "   docker-compose down"
echo ""
echo "🔄 Restart the bot:"
echo "   docker-compose restart"
echo ""
echo "📖 For more commands, see README.md or DOCKER.md"
echo ""
echo "Showing recent logs (Ctrl+C to exit):"
echo ""
sleep 2
docker-compose logs -f
