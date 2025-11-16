#!/bin/bash
# Complete server setup script for Whisk Automation

echo "============================================"
echo "Whisk Automation - Server Setup"
echo "============================================"

# Exit on error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or with sudo"
    exit 1
fi

# Variables
NODE_VERSION="20"
PROJECT_DIR="/opt/whisk-automation"
DEPLOY_USER=$(logname 2>/dev/null || echo $SUDO_USER)

echo "→ Step 1: Update system..."
apt-get update -qq
apt-get upgrade -y -qq

echo "→ Step 2: Install basic dependencies..."
apt-get install -y git curl wget gnupg2 build-essential

echo "→ Step 3: Install Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
echo "✓ Node.js $(node --version) installed"
echo "✓ npm $(npm --version) installed"

echo "→ Step 4: Install PM2..."
npm install -g pm2

echo "→ Step 5: Install MongoDB..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg
    echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -qq
    apt-get install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
fi
echo "✓ MongoDB installed"

echo "→ Step 6: Install Redis..."
if ! command -v redis-server &> /dev/null; then
    apt-get install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
fi
echo "✓ Redis installed"

echo "→ Step 7: Install Xvfb (Virtual Display)..."
apt-get install -y xvfb

echo "→ Step 8: Install Google Chrome..."
bash $(dirname "$0")/install-chrome.sh

echo "→ Step 9: Clone project (if not exists)..."
if [ ! -d "$PROJECT_DIR" ]; then
    git clone https://github.com/chutronglinh/whisk-automation.git $PROJECT_DIR
    chown -R $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR
fi

echo "→ Step 10: Install project dependencies..."
cd $PROJECT_DIR/backend
sudo -u $DEPLOY_USER npm install

echo "→ Step 11: Create data directories..."
mkdir -p $PROJECT_DIR/data/profiles
mkdir -p $PROJECT_DIR/data/uploads
mkdir -p $PROJECT_DIR/backend/logs
chown -R $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR/data
chown -R $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR/backend/logs

echo "→ Step 12: Setup environment..."
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    cat > $PROJECT_DIR/backend/.env << EOF
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/whisk-automation
REDIS_HOST=localhost
REDIS_PORT=6379
PROFILE_PATH=/opt/whisk-automation/data/profiles
DISPLAY=:99
CHROME_PATH=/usr/bin/google-chrome
EOF
    chown $DEPLOY_USER:$DEPLOY_USER $PROJECT_DIR/backend/.env
fi

echo "→ Step 13: Setup Xvfb as service..."
cat > /etc/systemd/system/xvfb.service << 'EOF'
[Unit]
Description=X Virtual Frame Buffer Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xvfb
systemctl start xvfb

echo "→ Step 14: Start application..."
cd $PROJECT_DIR/backend
sudo -u $DEPLOY_USER bash -c "export DISPLAY=:99 && pm2 start ecosystem.config.cjs && pm2 save"

echo "→ Step 15: Setup PM2 startup..."
env PATH=$PATH:/usr/bin pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER

echo "============================================"
echo "✓ Server setup complete!"
echo "============================================"
echo ""
echo "Services status:"
systemctl status mongod --no-pager | grep Active
systemctl status redis-server --no-pager | grep Active
systemctl status xvfb --no-pager | grep Active
echo ""
echo "PM2 status:"
sudo -u $DEPLOY_USER pm2 list
echo ""
echo "Access application at: http://$(hostname -I | awk '{print $1}'):3000"