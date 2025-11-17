#!/bin/bash

#############################################
# WHISK AUTOMATION - ONE-COMMAND DEPLOYMENT
# Ubuntu Server Deployment Script
#############################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="whisk-automation"
APP_DIR="/opt/${APP_NAME}"
USER="whisk"
DOMAIN="${DOMAIN:-localhost}"
NODE_VERSION="20"

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WHISK AUTOMATION - Auto Deployment         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}✗ Please run as root (use sudo)${NC}"
  exit 1
fi

echo -e "\n${GREEN}1. System Update${NC}"
apt-get update -qq
apt-get upgrade -y -qq

echo -e "\n${GREEN}2. Installing Required Packages${NC}"
apt-get install -y -qq \
  curl \
  wget \
  git \
  build-essential \
  software-properties-common \
  ca-certificates \
  gnupg \
  nginx \
  ufw \
  unzip

echo -e "\n${GREEN}3. Installing Node.js ${NODE_VERSION}${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo -e "   ${BLUE}✓ Node.js version: $(node -v)${NC}"
echo -e "   ${BLUE}✓ NPM version: $(npm -v)${NC}"

echo -e "\n${GREEN}4. Installing MongoDB${NC}"
if ! command -v mongod &> /dev/null; then
  wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
  echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt-get update -qq
  apt-get install -y mongodb-org
  systemctl enable mongod
  systemctl start mongod
fi
echo -e "   ${BLUE}✓ MongoDB installed and running${NC}"

echo -e "\n${GREEN}5. Installing Redis${NC}"
if ! command -v redis-server &> /dev/null; then
  apt-get install -y redis-server
  systemctl enable redis-server
  systemctl start redis-server
fi
echo -e "   ${BLUE}✓ Redis installed and running${NC}"

echo -e "\n${GREEN}6. Installing Google Chrome${NC}"
if ! command -v google-chrome &> /dev/null; then
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y ./google-chrome-stable_current_amd64.deb
  rm google-chrome-stable_current_amd64.deb
fi
echo -e "   ${BLUE}✓ Chrome version: $(google-chrome --version)${NC}"

echo -e "\n${GREEN}7. Installing PM2${NC}"
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
  pm2 startup systemd -u root --hp /root
fi
echo -e "   ${BLUE}✓ PM2 version: $(pm2 -v)${NC}"

echo -e "\n${GREEN}8. Creating Application User${NC}"
if ! id "$USER" &>/dev/null; then
  useradd -r -s /bin/bash -d "$APP_DIR" -m "$USER"
  echo -e "   ${BLUE}✓ User '$USER' created${NC}"
else
  echo -e "   ${BLUE}✓ User '$USER' already exists${NC}"
fi

echo -e "\n${GREEN}9. Creating Application Directory${NC}"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/data/profiles"
mkdir -p "$APP_DIR/data/uploads"
mkdir -p "$APP_DIR/data/output/images"
mkdir -p "$APP_DIR/logs"
chown -R "$USER":"$USER" "$APP_DIR"
echo -e "   ${BLUE}✓ Directories created at $APP_DIR${NC}"

echo -e "\n${GREEN}10. Cloning Repository${NC}"
read -p "Enter GitHub repository URL: " REPO_URL
if [ -z "$REPO_URL" ]; then
  echo -e "${RED}✗ Repository URL is required${NC}"
  exit 1
fi

cd "$APP_DIR"
if [ -d ".git" ]; then
  echo -e "   ${YELLOW}Repository exists, pulling latest changes...${NC}"
  sudo -u "$USER" git pull
else
  echo -e "   ${BLUE}Cloning repository...${NC}"
  sudo -u "$USER" git clone "$REPO_URL" .
fi

echo -e "\n${GREEN}11. Installing Dependencies${NC}"
echo -e "   ${BLUE}Installing backend dependencies...${NC}"
cd "$APP_DIR/backend"
sudo -u "$USER" npm install --production

echo -e "   ${BLUE}Installing frontend dependencies...${NC}"
cd "$APP_DIR/frontend"
sudo -u "$USER" npm install

echo -e "\n${GREEN}12. Building Frontend${NC}"
cd "$APP_DIR/frontend"
sudo -u "$USER" npm run build
echo -e "   ${BLUE}✓ Frontend built successfully${NC}"

echo -e "\n${GREEN}13. Setting up Environment Variables${NC}"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cat > "$APP_DIR/backend/.env" <<EOF
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/whisk-automation

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Paths
PROFILE_PATH=$APP_DIR/data/profiles
UPLOAD_PATH=$APP_DIR/data/uploads
OUTPUT_PATH=$APP_DIR/data/output/images

# Chrome
CHROME_PATH=/usr/bin/google-chrome
DISPLAY=:99

# Jobs
JOB_ATTEMPTS=3
JOB_BACKOFF_DELAY=5000
IMAGE_GENERATION_TIMEOUT=120000

# Image Generation
IMAGE_MODEL=IMAGEN_3_5
DEFAULT_ASPECT_RATIO=IMAGE_ASPECT_RATIO_LANDSCAPE
MEDIA_CATEGORY=MEDIA_CATEGORY_BOARD
EOF
  chown "$USER":"$USER" "$APP_DIR/backend/.env"
  echo -e "   ${BLUE}✓ Environment file created${NC}"
else
  echo -e "   ${YELLOW}✓ Environment file already exists${NC}"
fi

echo -e "\n${GREEN}14. Setting up Virtual Display (for Puppeteer)${NC}"
apt-get install -y xvfb
cat > /etc/systemd/system/xvfb.service <<EOF
[Unit]
Description=X Virtual Frame Buffer Service
After=network.target

[Service]
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24 -ac
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl enable xvfb
systemctl start xvfb
echo -e "   ${BLUE}✓ Virtual display configured${NC}"

echo -e "\n${GREEN}15. Configuring Nginx${NC}"
cat > /etc/nginx/sites-available/$APP_NAME <<EOF
upstream backend {
  server 127.0.0.1:3000;
  keepalive 64;
}

server {
  listen 80;
  server_name $DOMAIN;

  client_max_body_size 10M;

  # Frontend
  location / {
    root $APP_DIR/frontend/dist;
    try_files \$uri \$uri/ /index.html;

    add_header Cache-Control "public, max-age=3600";
  }

  # API
  location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
  }

  # Health check
  location /health {
    proxy_pass http://backend;
    access_log off;
  }
}
EOF

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx
echo -e "   ${BLUE}✓ Nginx configured and running${NC}"

echo -e "\n${GREEN}16. Starting Application with PM2${NC}"
cd "$APP_DIR/backend"
sudo -u root pm2 delete all 2>/dev/null || true
sudo -u root pm2 start ecosystem.config.cjs
sudo -u root pm2 save
echo -e "   ${BLUE}✓ Application started with PM2${NC}"

echo -e "\n${GREEN}17. Configuring Firewall${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo -e "   ${BLUE}✓ Firewall configured${NC}"

echo -e "\n${GREEN}18. Running System Health Check${NC}"
sleep 5

# Check services
services=("mongod" "redis-server" "nginx" "xvfb")
for service in "${services[@]}"; do
  if systemctl is-active --quiet "$service"; then
    echo -e "   ${GREEN}✓${NC} $service is running"
  else
    echo -e "   ${RED}✗${NC} $service is NOT running"
  fi
done

# Check PM2 processes
echo -e "\n   ${BLUE}PM2 Processes:${NC}"
pm2 status

# Check API
echo -e "\n   ${BLUE}Testing API health...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo -e "   ${GREEN}✓${NC} API is responding"
else
  echo -e "   ${YELLOW}⚠${NC} API might still be starting..."
fi

echo -e "\n${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          DEPLOYMENT COMPLETED! 🚀             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Access your application:${NC}"
echo -e "  Frontend: ${GREEN}http://$DOMAIN${NC}"
echo -e "  Backend:  ${GREEN}http://$DOMAIN/api${NC}"
echo -e "  Health:   ${GREEN}http://$DOMAIN/api/health${NC}"

echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  View logs:     ${YELLOW}pm2 logs${NC}"
echo -e "  Restart:       ${YELLOW}pm2 restart all${NC}"
echo -e "  Stop:          ${YELLOW}pm2 stop all${NC}"
echo -e "  Status:        ${YELLOW}pm2 status${NC}"
echo -e "  Monitor:       ${YELLOW}pm2 monit${NC}"

echo -e "\n${BLUE}Application directory:${NC} ${GREEN}$APP_DIR${NC}"
echo -e "${BLUE}Logs directory:${NC} ${GREEN}$APP_DIR/logs${NC}"

echo -e "\n${YELLOW}⚠ IMPORTANT:${NC}"
echo -e "  1. Update domain in nginx config: ${GREEN}/etc/nginx/sites-available/$APP_NAME${NC}"
echo -e "  2. Configure SSL with Let's Encrypt: ${YELLOW}certbot --nginx -d your-domain.com${NC}"
echo -e "  3. Review environment variables: ${GREEN}$APP_DIR/backend/.env${NC}"

echo -e "\n${GREEN}Deployment completed successfully! ✨${NC}\n"
