#!/bin/bash

################################################################################
# WHISK AUTOMATION - UPDATE SCRIPT
# Quick update deployed application
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/whisk-automation"

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WHISK AUTOMATION - UPDATE                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"

if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}✗ Application not found at $APP_DIR${NC}"
  exit 1
fi

cd "$APP_DIR"

echo -e "\n${GREEN}1. Pulling latest code${NC}"
git fetch origin
git pull origin main

echo -e "\n${GREEN}2. Installing backend dependencies${NC}"
cd "$APP_DIR/backend"
npm install --production

echo -e "\n${GREEN}3. Installing frontend dependencies${NC}"
cd "$APP_DIR/frontend"
npm install

echo -e "\n${GREEN}4. Building frontend${NC}"
npm run build

echo -e "\n${GREEN}5. Restarting application${NC}"
pm2 restart all

echo -e "\n${GREEN}6. Checking status${NC}"
sleep 3
pm2 status

echo -e "\n${GREEN}✓ Update completed!${NC}"
echo -e "${BLUE}View logs: ${YELLOW}pm2 logs${NC}\n"
