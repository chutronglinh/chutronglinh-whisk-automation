#!/bin/bash
# Whisk Automation - Deploy/Update
# Updates code while keeping data

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Whisk Automation - Deploy Update"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /opt/whisk-automation

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted local changes"
    read -p "Stash changes and continue? (yes/no): " stash_choice
    if [ "$stash_choice" = "yes" ]; then
        git stash
    else
        echo "Deploy cancelled"
        exit 0
    fi
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install/update backend dependencies
echo "📦 Updating backend dependencies..."
cd backend
npm install

# Install/update frontend dependencies
echo "📦 Updating frontend dependencies..."
cd ../frontend
npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Restart PM2 processes
echo "🔄 Restarting PM2 processes..."
cd ../backend
pm2 restart all

# Restart nginx
echo "🔄 Restarting nginx..."
sudo systemctl restart nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Check status:"
echo "   pm2 list"
echo "   pm2 logs"
echo ""