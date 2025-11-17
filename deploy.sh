#!/bin/bash

# Whisk Automation Deploy Script
# Usage: ./deploy.sh [dev|prod]

set -e  # Exit on error

MODE=${1:-prod}  # Default to production
PROJECT_DIR="/opt/whisk-automation"

echo "=========================================="
echo "Whisk Automation Deployment"
echo "Mode: $MODE"
echo "=========================================="

cd $PROJECT_DIR

# 1. Pull latest code
echo "📥 Pulling latest code from GitHub..."
sudo git pull origin main

# 2. Install backend dependencies (if package.json changed)
echo "📦 Checking backend dependencies..."
cd backend
if [ -f "package-lock.json" ]; then
    npm ci --only=production
fi

# 3. Install frontend dependencies (if package.json changed)
echo "📦 Checking frontend dependencies..."
cd ../frontend
if [ -f "package-lock.json" ]; then
    npm ci
fi

# 4. Build frontend for production
if [ "$MODE" = "prod" ]; then
    echo "🏗️  Building frontend for production..."
    npm run build

    echo "📋 Copying nginx config..."
    sudo cp ../nginx.conf /etc/nginx/sites-available/whisk-automation
    sudo ln -sf /etc/nginx/sites-available/whisk-automation /etc/nginx/sites-enabled/

    echo "🔄 Testing nginx config..."
    sudo nginx -t

    echo "♻️  Reloading nginx..."
    sudo systemctl reload nginx
fi

# 5. Restart backend services
echo "♻️  Restarting backend services..."
cd ../backend
sudo pm2 restart ecosystem.config.cjs

echo ""
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
if [ "$MODE" = "prod" ]; then
    echo "🌐 Production: http://192.168.163.149"
fi
echo "🛠️  Development: http://192.168.163.149:5173"
echo "📊 Backend API: http://192.168.163.149:3000"
echo ""
echo "📝 PM2 Status:"
sudo pm2 status
