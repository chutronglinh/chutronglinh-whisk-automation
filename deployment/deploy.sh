#!/bin/bash
# Whisk Automation - Deploy/Update (IMPROVED v2.0)
# Updates code while keeping data
# Auto-fixes permissions, ownership, and git issues

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Whisk Automation - Deploy Update"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /opt/whisk-automation

# ============================================
# FIX 1: Configure Git to ignore file permissions
# ============================================
echo "🔧 Configuring Git..."
git config core.filemode false

# ============================================
# FIX 2: Auto-fix ownership issues
# ============================================
echo "🔧 Fixing ownership..."
sudo chown -R $USER:$USER /opt/whisk-automation 2>/dev/null || {
    echo "⚠️  Warning: Could not fix all ownership issues"
    echo "You may need to run: sudo chown -R $USER:$USER /opt/whisk-automation"
}

# ============================================
# FIX 3: Make scripts executable
# ============================================
echo "🔧 Ensuring scripts are executable..."
chmod +x deployment/*.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

# ============================================
# FIX 4: Handle uncommitted changes gracefully
# ============================================
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Detected uncommitted local changes"
    echo "📦 Auto-stashing changes..."
    git stash push -m "Auto-stash before deploy $(date +%Y%m%d-%H%M%S)" 2>/dev/null || {
        echo "⚠️  Could not stash. Attempting to continue anyway..."
    }
fi

# ============================================
# Pull latest code
# ============================================
echo "📥 Pulling latest code from Git..."
git pull origin main || {
    echo "❌ Git pull failed. Attempting force pull..."
    git fetch origin
    git reset --hard origin/main
}

# ============================================
# Install/update backend dependencies
# ============================================
echo "📦 Updating backend dependencies..."
cd backend
npm install || {
    echo "⚠️  npm install failed, trying clean install..."
    rm -rf node_modules package-lock.json
    npm install
}

# ============================================
# Install/update frontend dependencies
# ============================================
echo "📦 Updating frontend dependencies..."
cd ../frontend
npm install || {
    echo "⚠️  npm install failed, trying clean install..."
    rm -rf node_modules package-lock.json
    npm install
}

# ============================================
# FIX 5: Clean dist before build to avoid permission issues
# ============================================
echo "🧹 Cleaning build directory..."
if [ -d "dist" ]; then
    # Try normal remove first
    rm -rf dist 2>/dev/null || {
        # If fails, try with sudo
        echo "Using sudo to remove dist..."
        sudo rm -rf dist
    }
fi

# ============================================
# Build frontend
# ============================================
echo "🏗️  Building frontend..."
npm run build

# ============================================
# FIX 6: Fix ownership of newly built files
# ============================================
echo "🔧 Fixing build output ownership..."
sudo chown -R $USER:$USER dist 2>/dev/null || chown -R $USER:$USER dist 2>/dev/null || true

# ============================================
# Restart PM2 processes
# ============================================
echo "🔄 Restarting PM2 processes..."
cd ../backend
pm2 restart all || {
    echo "⚠️  PM2 restart failed, attempting to start..."
    pm2 start ecosystem.config.cjs
}

# ============================================
# Restart nginx
# ============================================
echo "🔄 Restarting nginx..."
sudo systemctl restart nginx || {
    echo "⚠️  Nginx restart failed"
    sudo systemctl status nginx
}

# ============================================
# Final ownership fix
# ============================================
echo "🔧 Final permission check..."
cd /opt/whisk-automation
sudo chown -R $USER:$USER . 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Quick check:"
echo "   pm2 list              - View all processes"
echo "   pm2 logs --lines 20   - View recent logs"
echo "   pm2 monit             - Live monitoring"
echo ""
echo "🌐 Access: http://YOUR_SERVER_IP/accounts"
echo ""