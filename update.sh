#!/bin/bash

# Quick update script - just pull code and restart
# Usage: ./update.sh

set -e

PROJECT_DIR="/opt/whisk-automation"

echo "🔄 Quick Update..."
cd $PROJECT_DIR

echo "📥 Pulling latest code..."
sudo git pull origin main

echo "♻️  Restarting backend..."
cd backend
sudo pm2 restart ecosystem.config.cjs

echo "✅ Update completed!"
echo ""
echo "Note: Frontend dev server on port 5173 needs manual restart if needed"
