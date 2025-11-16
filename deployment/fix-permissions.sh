#!/bin/bash
# Whisk Automation - Fix Permissions & Ownership
# Run this if you encounter permission issues

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Fixing Permissions & Ownership"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're in the right directory
if [ ! -f "deployment/fix-permissions.sh" ]; then
    echo "❌ Error: Must be run from /opt/whisk-automation directory"
    echo "Run: cd /opt/whisk-automation && bash deployment/fix-permissions.sh"
    exit 1
fi

# ============================================
# Step 1: Fix ownership
# ============================================
echo "📂 Step 1/6: Fixing ownership..."
sudo chown -R $USER:$USER /opt/whisk-automation
echo "✅ Ownership fixed: $USER:$USER"

# ============================================
# Step 2: Configure Git
# ============================================
echo ""
echo "⚙️  Step 2/6: Configuring Git..."
cd /opt/whisk-automation
git config core.filemode false
git config --global --add safe.directory /opt/whisk-automation
echo "✅ Git configured to ignore file permissions"

# ============================================
# Step 3: Fix script permissions
# ============================================
echo ""
echo "📜 Step 3/6: Making scripts executable..."
chmod +x deployment/*.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true
echo "✅ Scripts are now executable"

# ============================================
# Step 4: Fix data directories
# ============================================
echo ""
echo "📁 Step 4/6: Setting up data directories..."
mkdir -p data/profiles
mkdir -p data/output
mkdir -p backend/logs
chmod -R 755 data
chmod -R 755 backend/logs
echo "✅ Data directories configured"

# ============================================
# Step 5: Clean up problematic files
# ============================================
echo ""
echo "🧹 Step 5/6: Cleaning up..."
# Remove dist if owned by root
if [ -d "frontend/dist" ]; then
    sudo rm -rf frontend/dist 2>/dev/null || rm -rf frontend/dist 2>/dev/null || true
fi
# Remove any .save files
find . -name "*.save" -type f -delete 2>/dev/null || true
echo "✅ Cleanup complete"

# ============================================
# Step 6: Verify permissions
# ============================================
echo ""
echo "✔️  Step 6/6: Verifying permissions..."
echo ""
echo "Project ownership:"
ls -ld /opt/whisk-automation | awk '{print "  Owner: " $3 ":" $4}'
echo ""
echo "Script permissions:"
ls -la deployment/*.sh | head -3 | awk '{print "  " $1 " " $9}'
echo ""
echo "Data directories:"
ls -ld data/profiles data/output backend/logs 2>/dev/null | awk '{print "  " $1 " " $9}' || echo "  (will be created on first use)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL PERMISSIONS FIXED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 You can now run:"
echo "   bash deployment/deploy.sh"
echo ""