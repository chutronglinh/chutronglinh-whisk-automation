#!/bin/bash

################################################################################
# WHISK AUTOMATION - COMPLETE UNINSTALL SCRIPT
# Removes all components and data
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

APP_DIR="/opt/whisk-automation"

# Print banner
echo -e "${RED}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ⚠️  WHISK AUTOMATION UNINSTALLER ⚠️                ║"
echo "║                                                              ║"
echo "║          This will COMPLETELY REMOVE the system             ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}✗ Please run as root (use sudo)${NC}"
  exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will delete:${NC}"
echo "   - All PM2 processes"
echo "   - Application files at $APP_DIR"
echo "   - Nginx configuration"
echo "   - Profile data (Chrome profiles)"
echo "   - Uploaded files"
echo "   - Generated images"
echo ""
echo -e "${YELLOW}⚠️  This will NOT delete (optional):${NC}"
echo "   - MongoDB (database)"
echo "   - Redis"
echo "   - Node.js"
echo "   - Google Chrome"
echo ""

# Check for non-interactive mode
if [ "$FORCE_UNINSTALL" != "yes" ]; then
  read -p "Do you want to continue? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${BLUE}Uninstall cancelled.${NC}"
    exit 0
  fi
else
  echo -e "${YELLOW}Running in non-interactive mode (FORCE_UNINSTALL=yes)${NC}"
fi

echo ""

# 1. Stop and remove PM2 processes
echo -e "${BLUE}━━━ Step 1: Stopping PM2 processes ━━━${NC}"
if command -v pm2 &> /dev/null; then
  pm2 delete all 2>/dev/null || true
  pm2 save --force 2>/dev/null || true
  pm2 unstartup 2>/dev/null || true
  echo -e "${GREEN}✓ PM2 processes stopped${NC}"
else
  echo -e "${YELLOW}⚠ PM2 not found, skipping${NC}"
fi

# 2. Stop system services
echo -e "${BLUE}━━━ Step 2: Stopping system services ━━━${NC}"
systemctl stop nginx 2>/dev/null || true
systemctl stop xvfb 2>/dev/null || true
echo -e "${GREEN}✓ System services stopped${NC}"

# 3. Remove Nginx configuration
echo -e "${BLUE}━━━ Step 3: Removing Nginx configuration ━━━${NC}"
rm -f /etc/nginx/sites-enabled/whisk-automation
rm -f /etc/nginx/sites-available/whisk-automation
systemctl restart nginx 2>/dev/null || true
echo -e "${GREEN}✓ Nginx configuration removed${NC}"

# 4. Remove application directory
echo -e "${BLUE}━━━ Step 4: Removing application files ━━━${NC}"
if [ -d "$APP_DIR" ]; then
  echo -e "${YELLOW}Removing: $APP_DIR${NC}"
  rm -rf "$APP_DIR"
  echo -e "${GREEN}✓ Application files removed${NC}"
else
  echo -e "${YELLOW}⚠ Application directory not found${NC}"
fi

# 5. Remove xvfb service
echo -e "${BLUE}━━━ Step 5: Removing Xvfb service ━━━${NC}"
systemctl stop xvfb 2>/dev/null || true
systemctl disable xvfb 2>/dev/null || true
rm -f /etc/systemd/system/xvfb.service
systemctl daemon-reload
echo -e "${GREEN}✓ Xvfb service removed${NC}"

# 6. Remove xhost autostart (optional)
echo -e "${BLUE}━━━ Step 6: Removing xhost autostart ━━━${NC}"
ACTUAL_USER="${SUDO_USER:-$(who | awk '{print $1}' | head -n 1)}"
if [ -n "$ACTUAL_USER" ] && [ "$ACTUAL_USER" != "root" ]; then
  ACTUAL_HOME=$(eval echo ~$ACTUAL_USER)
  rm -f "$ACTUAL_HOME/.config/autostart/xhost-allow-local.desktop" 2>/dev/null || true

  # Remove from .profile
  if [ -f "$ACTUAL_HOME/.profile" ]; then
    sed -i '/# Allow local X server connections for Chrome automation/,/fi/d' "$ACTUAL_HOME/.profile" 2>/dev/null || true
  fi

  echo -e "${GREEN}✓ Xhost autostart removed${NC}"
else
  echo -e "${YELLOW}⚠ User not found, skipping${NC}"
fi

# 7. Optional: Remove MongoDB data
echo ""
if [ "$FORCE_UNINSTALL" != "yes" ]; then
  read -p "Do you want to remove MongoDB database? (yes/no): " REMOVE_MONGO
else
  REMOVE_MONGO="${REMOVE_MONGO:-yes}"
  echo -e "${YELLOW}MongoDB removal: $REMOVE_MONGO (override with REMOVE_MONGO env var)${NC}"
fi

if [ "$REMOVE_MONGO" = "yes" ]; then
  echo -e "${BLUE}━━━ Removing MongoDB database ━━━${NC}"
  systemctl stop mongod 2>/dev/null || true
  rm -rf /var/lib/mongodb/* 2>/dev/null || true
  systemctl start mongod 2>/dev/null || true
  echo -e "${GREEN}✓ MongoDB database removed${NC}"
else
  echo -e "${YELLOW}⚠ MongoDB database kept${NC}"
fi

# 8. Optional: Remove Redis data
echo ""
if [ "$FORCE_UNINSTALL" != "yes" ]; then
  read -p "Do you want to remove Redis data? (yes/no): " REMOVE_REDIS
else
  REMOVE_REDIS="${REMOVE_REDIS:-yes}"
  echo -e "${YELLOW}Redis removal: $REMOVE_REDIS (override with REMOVE_REDIS env var)${NC}"
fi

if [ "$REMOVE_REDIS" = "yes" ]; then
  echo -e "${BLUE}━━━ Removing Redis data ━━━${NC}"
  systemctl stop redis-server 2>/dev/null || true
  rm -f /var/lib/redis/dump.rdb 2>/dev/null || true
  systemctl start redis-server 2>/dev/null || true
  echo -e "${GREEN}✓ Redis data removed${NC}"
else
  echo -e "${YELLOW}⚠ Redis data kept${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ✅ UNINSTALL COMPLETED                             ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}System is now clean and ready for fresh installation!${NC}"
echo ""
echo -e "${YELLOW}To install again, run:${NC}"
echo -e "${GREEN}curl -fsSL https://raw.githubusercontent.com/chutronglinh/chutronglinh-whisk-automation/main/install.sh | sudo bash${NC}"
echo ""
