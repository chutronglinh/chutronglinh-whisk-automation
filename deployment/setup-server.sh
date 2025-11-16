#!/bin/bash
# Whisk Automation - Complete Server Setup
# Run on fresh Ubuntu 24.04 server

set -e  # Exit on error

echo "=================================="
echo "🚀 Whisk Automation - Server Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please DO NOT run as root (without sudo)${NC}"
   exit 1
fi

# Check Ubuntu version
if ! grep -q "Ubuntu 24.04" /etc/os-release; then
    echo -e "${YELLOW}⚠️  Warning: This script is designed for Ubuntu 24.04${NC}"
    read -p "Continue anyway? (yes/no): " continue_setup
    if [ "$continue_setup" != "yes" ]; then
        exit 0
    fi
fi

# Detect if this is a fresh install or update
if [ -d "/opt/whisk-automation" ] && [ -f "/opt/whisk-automation/.setup-complete" ]; then
    echo -e "${YELLOW}⚠️  Existing installation detected!${NC}"
    echo ""
    echo "Choose an option:"
    echo "1) Full reset and reinstall (⚠️  DELETES ALL DATA)"
    echo "2) Update code only (keeps data)"
    echo "3) Cancel"
    read -p "Your choice (1/2/3): " choice
    
    case $choice in
        1) 
            echo -e "${RED}Starting full reset...${NC}"
            ./deployment/reset-and-deploy.sh
            exit 0
            ;;
        2) 
            echo -e "${GREEN}Starting update...${NC}"
            ./deployment/deploy.sh
            exit 0
            ;;
        *)
            echo "Setup cancelled"
            exit 0
            ;;
    esac
fi

echo -e "${GREEN}✓ Fresh server detected - Starting installation...${NC}"
echo ""

# Step 1: System update
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1/8: Updating system packages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt update -qq
sudo apt upgrade -y -qq
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Step 2: Install system dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 2/8: Installing system dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
chmod +x deployment/install-dependencies.sh
./deployment/install-dependencies.sh
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Setup project directory
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Step 3/8: Setting up project directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ! -d "/opt/whisk-automation" ]; then
    sudo mkdir -p /opt/whisk-automation
    sudo chown -R $USER:$USER /opt/whisk-automation
    cp -r . /opt/whisk-automation/
    cd /opt/whisk-automation
else
    cd /opt/whisk-automation
    git pull origin main
fi
echo -e "${GREEN}✓ Project directory ready${NC}"
echo ""

# Step 4: Install Node.js packages
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 4/8: Installing Node.js packages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
chmod +x deployment/install-node-packages.sh
./deployment/install-node-packages.sh
echo -e "${GREEN}✓ Node packages installed${NC}"
echo ""

# Step 5: Configure services
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  Step 5/8: Configuring services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Setup Nginx
sudo cp deployment/nginx.conf /etc/nginx/sites-available/whisk-automation
sudo ln -sf /etc/nginx/sites-available/whisk-automation /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

# Setup environment
if [ ! -f "backend/.env" ]; then
    cp deployment/.env.example backend/.env
fi

# Create data directories
mkdir -p data/profiles
mkdir -p data/output
mkdir -p backend/logs

echo -e "${GREEN}✓ Services configured${NC}"
echo ""

# Step 6: Build frontend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  Step 6/8: Building frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd frontend
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Step 7: Setup PM2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Step 7/8: Setting up PM2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd backend
pm2 start ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
cd ..
echo -e "${GREEN}✓ PM2 configured${NC}"
echo ""

# Step 8: Start all services
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Step 8/8: Starting all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo systemctl restart nginx
sudo systemctl restart mongod
sudo systemctl restart redis-server
sudo systemctl enable nginx
sudo systemctl enable mongod
sudo systemctl enable redis-server

# Mark setup as complete
touch /opt/whisk-automation/.setup-complete

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://YOUR_SERVER_IP/accounts"
echo "   API:      http://YOUR_SERVER_IP/api/accounts"
echo ""
echo "📊 Manage services:"
echo "   pm2 list              - View all processes"
echo "   pm2 logs              - View logs"
echo "   pm2 restart all       - Restart all workers"
echo ""
echo "🔄 Update code:"
echo "   cd /opt/whisk-automation"
echo "   ./deployment/deploy.sh"
echo ""
echo "📖 Full documentation: deployment/README.md"
echo ""