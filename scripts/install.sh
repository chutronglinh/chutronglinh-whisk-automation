#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_URL="https://github.com/chutronglinh/whisk-automation.git"
INSTALL_DIR="/opt/whisk-automation"

print_step() { echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}\n"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

echo ""
echo "=========================================="
echo "  WHISK AUTOMATION - AUTO INSTALLER"
echo "  Repository: chutronglinh/whisk-automation"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "Must run with sudo"
   echo "Usage: sudo bash install.sh"
   exit 1
fi

# Update system
print_step "[1/12] Updating system..."
apt update -qq && apt upgrade -y -qq
apt install -y curl wget git build-essential
print_success "System updated"

# Install Node.js
print_step "[2/12] Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
npm install -g pm2
print_success "Node.js $(node -v) & PM2 installed"

# Install MongoDB
print_step "[3/12] Installing MongoDB 7.0..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt update -qq
    apt install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
fi
print_success "MongoDB installed & running"

# Install Redis
print_step "[4/12] Installing Redis..."
if ! command -v redis-server &> /dev/null; then
    apt install -y redis-server
    sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
    systemctl restart redis-server
    systemctl enable redis-server
fi
print_success "Redis installed & running"

# Install Nginx
print_step "[5/12] Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
print_success "Nginx installed & running"

# Clone repository
print_step "[6/12] Cloning repository..."
mkdir -p "$INSTALL_DIR"
if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git pull origin main
    print_success "Repository updated"
else
    git clone "$REPO_URL" "$INSTALL_DIR"
    print_success "Repository cloned"
fi

# Create directories
print_step "[7/12] Creating directories..."
mkdir -p "$INSTALL_DIR/data"/{profiles,output,uploads}
mkdir -p "$INSTALL_DIR/logs"/{backend,workers}
mkdir -p /var/www/whisk-frontend
print_success "Directories created"

# Install backend
print_step "[8/12] Installing backend dependencies..."
cd "$INSTALL_DIR/backend"
npm install --production

# Create .env if not exists
if [ ! -f .env ]; then
    print_step "Creating .env file..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

MONGODB_URI=mongodb://localhost:27017/whisk-automation
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=57d130416d1bac636491ccf12aca55d4fa811e9884fe6cd276b6f721237e0a68
JWT_EXPIRES_IN=7d

UPLOAD_PATH=/opt/whisk-automation/data/uploads
OUTPUT_PATH=/opt/whisk-automation/data/output
PROFILE_PATH=/opt/whisk-automation/data/profiles

QUEUE_CONCURRENCY=5
MAX_RETRY_ATTEMPTS=3

BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000

LOG_LEVEL=info
LOG_PATH=/opt/whisk-automation/logs

WHISK_URL=https://labs.google/fx/tools/whisk
SESSION_API=https://labs.google/fx/api/auth/session
EOF
    print_success ".env created"
fi
print_success "Backend installed"

# Install & build frontend
print_step "[9/12] Building frontend..."
cd "$INSTALL_DIR/frontend"
npm install
npm run build
rm -rf /var/www/whisk-frontend/*
cp -r dist/* /var/www/whisk-frontend/
chown -R www-data:www-data /var/www/whisk-frontend
chmod -R 755 /var/www/whisk-frontend
print_success "Frontend built & deployed"

# Configure Nginx
print_step "[10/12] Configuring Nginx..."
cat > /etc/nginx/sites-available/whisk-automation << 'NGINX_EOF'
upstream whisk_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    location / {
        root /var/www/whisk-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://whisk_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://whisk_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    location /output {
        alias /opt/whisk-automation/data/output;
        autoindex off;
        expires 30d;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/whisk-automation /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
print_success "Nginx configured"

# Start backend
print_step "[11/12] Starting backend with PM2..."
cd "$INSTALL_DIR/backend"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
print_success "Backend started"

# Firewall
print_step "[12/12] Configuring firewall..."
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable
print_success "Firewall configured"

# Final summary
echo ""
echo "=========================================="
echo "  ✓ INSTALLATION COMPLETED!"
echo "=========================================="
echo ""
echo "Services Status:"
echo "  ✓ Node.js:  $(node -v)"
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
echo "Useful commands:"
echo "  pm2 logs       - View logs"
echo "  pm2 monit      - Monitor processes"
echo "  pm2 restart all - Restart all"
echo ""