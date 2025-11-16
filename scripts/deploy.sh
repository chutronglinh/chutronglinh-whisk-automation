#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

INSTALL_DIR="/opt/whisk-automation"
REPO_URL="https://github.com/chutronglinh/whisk-automation.git"

print_step() { echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}\n"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

echo ""
echo "=========================================="
echo "  WHISK AUTOMATION - DEPLOYMENT"
echo "  Repository: chutronglinh/whisk-automation"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "Must run with sudo"
   echo "Usage: sudo bash deploy.sh"
   exit 1
fi

# Check if directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    print_error "Installation directory not found: $INSTALL_DIR"
    echo "Please run install.sh first"
    exit 1
fi

# Pull latest code
print_step "[1/6] Pulling latest code from GitHub..."
cd "$INSTALL_DIR"
git fetch origin
git reset --hard origin/main
print_success "Code updated"

# Update backend dependencies
print_step "[2/6] Updating backend dependencies..."
cd "$INSTALL_DIR/backend"
npm install --production
print_success "Backend dependencies updated"

# Update frontend dependencies & rebuild
print_step "[3/6] Rebuilding frontend..."
cd "$INSTALL_DIR/frontend"
npm install
npm run build
print_success "Frontend rebuilt"

# Deploy frontend
print_step "[4/6] Deploying frontend..."
rm -rf /var/www/whisk-frontend/*
cp -r dist/* /var/www/whisk-frontend/
chown -R www-data:www-data /var/www/whisk-frontend
chmod -R 755 /var/www/whisk-frontend
print_success "Frontend deployed"

# Reload PM2
print_step "[5/6] Reloading backend processes..."
cd "$INSTALL_DIR/backend"
pm2 reload all
print_success "Backend reloaded"

# Reload Nginx
print_step "[6/6] Reloading Nginx..."
nginx -t && systemctl reload nginx
print_success "Nginx reloaded"

# Summary
echo ""
echo "=========================================="
echo "  ✓ DEPLOYMENT COMPLETED!"
echo "=========================================="
echo ""
echo "Services Status:"
echo "  ✓ MongoDB:  $(systemctl is-active mongod)"
echo "  ✓ Redis:    $(systemctl is-active redis-server)"
echo "  ✓ Nginx:    $(systemctl is-active nginx)"
echo ""
echo "PM2 Processes:"
pm2 list
echo ""
echo "Access your application:"
echo "  → http://$(hostname -I | awk '{print $1}')"
echo "  → http://192.168.163.149"
echo ""
echo "View logs: pm2 logs"
echo ""