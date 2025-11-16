#!/bin/bash
# Cleanup logs, cache, and temporary files

set -e

cd /opt/whisk-automation

echo "🧹 Cleaning up system..."

# Clear PM2 logs
echo "Clearing PM2 logs..."
pm2 flush

# Clear application logs
echo "Clearing application logs..."
rm -rf backend/logs/*
mkdir -p backend/logs

# Clear nginx cache
echo "Clearing nginx cache..."
sudo rm -rf /var/cache/nginx/*

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Clear Redis (optional - uncomment if needed)
# echo "Clearing Redis cache..."
# redis-cli FLUSHALL

# Clear old profiles (older than 30 days)
echo "Clearing old profiles..."
find data/profiles -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Disk usage:"
du -sh data/* backend/logs 2>/dev/null || true