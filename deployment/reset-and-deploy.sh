#!/bin/bash
# Whisk Automation - Full Reset and Redeploy
# ⚠️  WARNING: This will DELETE all data!

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 FULL SYSTEM RESET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  WARNING: This will DELETE:"
echo "   - All MongoDB databases"
echo "   - All Redis cache"
echo "   - All Chrome profiles"
echo "   - All logs and output"
echo "   - PM2 processes"
echo ""
echo "💾 This will KEEP:"
echo "   - System packages (Node.js, MongoDB, etc.)"
echo "   - Nginx configuration"
echo "   - Source code"
echo ""

read -p "Type 'DELETE-EVERYTHING' to confirm: " confirm

if [ "$confirm" != "DELETE-EVERYTHING" ]; then
    echo "❌ Reset cancelled"
    exit 0
fi

echo ""
echo "🗑️  Starting system reset..."
echo ""

# Stop all PM2 processes
echo "Stopping PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Clear databases
echo "Clearing MongoDB..."
mongosh --quiet --eval 'db.getSiblingDB("whisk-automation").dropDatabase()' 2>/dev/null || true

echo "Clearing Redis..."
redis-cli FLUSHALL 2>/dev/null || true

# Clear data directories
echo "Clearing data directories..."
cd /opt/whisk-automation
rm -rf data/profiles/*
rm -rf data/output/*
rm -rf backend/logs/*
rm -rf frontend/dist

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Clear nginx cache
echo "Clearing nginx cache..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true

echo ""
echo "✅ Reset complete!"
echo ""
echo "🚀 Starting fresh deployment..."
echo ""

# Pull latest code
echo "Pulling latest code..."
git fetch origin
git reset --hard origin/main

# Install dependencies
echo "Installing backend dependencies..."
cd backend
npm install

echo "Installing frontend dependencies..."
cd ../frontend
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Start PM2
echo "Starting PM2 processes..."
cd ../backend
pm2 start ecosystem.config.cjs
pm2 save

# Restart services
echo "Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart mongod
sudo systemctl restart redis-server

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ RESET AND DEPLOY COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 System is now running with fresh data"
echo ""
echo "Next steps:"
echo "1. Import accounts: Click 'Import CSV' on frontend"
echo "2. Test the system"
echo ""