#!/bin/bash

################################################################################
# WHISK AUTOMATION - ONE-COMMAND INSTALLATION
# Ubuntu 20.04/22.04/24.04 LTS
#
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/whisk-automation/main/install.sh | sudo bash
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="whisk-automation"
APP_DIR="/opt/${APP_NAME}"
REPO_URL="${REPO_URL:-https://github.com/chutronglinh/chutronglinh-whisk-automation.git}"
NODE_VERSION="20"
DOMAIN="${DOMAIN:-_}"

# Print banner
print_banner() {
  echo -e "${PURPLE}"
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                                                              ║"
  echo "║          🚀 WHISK AUTOMATION INSTALLER 🚀                    ║"
  echo "║                                                              ║"
  echo "║          Automated Google Whisk Image Generation            ║"
  echo "║                                                              ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# Print step
print_step() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}➜ $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Print success
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Print error
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Print warning
print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if running as root
check_root() {
  if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
  fi
}

# Detect Ubuntu version
detect_ubuntu() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID

    if [[ ! "$OS" =~ "Ubuntu" ]]; then
      print_error "This script is for Ubuntu only. Detected: $OS"
      exit 1
    fi

    print_success "Detected: $OS $VER"
  else
    print_error "Cannot detect OS version"
    exit 1
  fi
}

# System update
system_update() {
  print_step "STEP 1: System Update"

  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get upgrade -y -qq

  print_success "System updated"
}

# Install dependencies
install_dependencies() {
  print_step "STEP 2: Installing System Dependencies"

  apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    ca-certificates \
    gnupg \
    lsb-release \
    nginx \
    ufw \
    unzip \
    xvfb \
    x11vnc \
    supervisor

  print_success "System dependencies installed"
}

# Install Node.js
install_nodejs() {
  print_step "STEP 3: Installing Node.js ${NODE_VERSION}"

  if command -v node &> /dev/null; then
    CURRENT_NODE=$(node -v)
    print_success "Node.js already installed: $CURRENT_NODE"
    print_success "NPM $(npm -v) installed"
    return
  fi

  # Remove old nodejs
  apt-get remove -y nodejs npm 2>/dev/null || true

  # Install from NodeSource
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs

  print_success "Node.js $(node -v) installed"
  print_success "NPM $(npm -v) installed"
}

# Install MongoDB
install_mongodb() {
  print_step "STEP 4: Installing MongoDB"

  if command -v mongod &> /dev/null; then
    print_warning "MongoDB already installed"
    return
  fi

  # Detect Ubuntu version
  UBUNTU_VERSION=$(lsb_release -cs)

  echo -e "${BLUE}Detected Ubuntu: $UBUNTU_VERSION${NC}"

  # Choose MongoDB version based on Ubuntu version
  if [ "$UBUNTU_VERSION" = "noble" ]; then
    # Ubuntu 24.04 - Use MongoDB 8.0
    print_warning "Ubuntu 24.04 detected, installing MongoDB 8.0..."

    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
      gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg

    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
      tee /etc/apt/sources.list.d/mongodb-org-8.0.list

  elif [ "$UBUNTU_VERSION" = "jammy" ]; then
    # Ubuntu 22.04 - Use MongoDB 7.0
    print_warning "Ubuntu 22.04 detected, installing MongoDB 7.0..."

    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
      gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
      tee /etc/apt/sources.list.d/mongodb-org-7.0.list

  else
    # Ubuntu 20.04 or older - Use MongoDB 7.0 with jammy repo
    print_warning "Using MongoDB 7.0 for compatibility..."

    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
      gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
      tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  fi

  # Install MongoDB
  apt-get update -qq
  apt-get install -y mongodb-org

  # Start and enable
  systemctl daemon-reload
  systemctl enable mongod
  systemctl start mongod

  # Wait for MongoDB to start
  sleep 3

  # Verify MongoDB is running
  if systemctl is-active --quiet mongod; then
    MONGO_VERSION=$(mongod --version | head -n 1)
    print_success "MongoDB installed and started: $MONGO_VERSION"
  else
    print_error "MongoDB failed to start"
    systemctl status mongod
  fi
}

# Install Redis
install_redis() {
  print_step "STEP 5: Installing Redis"

  if command -v redis-server &> /dev/null; then
    print_warning "Redis already installed"
    return
  fi

  apt-get install -y redis-server

  # Configure Redis
  sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf

  systemctl enable redis-server
  systemctl restart redis-server

  print_success "Redis installed and started"
}

# Install Google Chrome
install_chrome() {
  print_step "STEP 6: Installing Google Chrome"

  if command -v google-chrome &> /dev/null; then
    print_warning "Google Chrome already installed"
    return
  fi

  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y ./google-chrome-stable_current_amd64.deb
  rm -f google-chrome-stable_current_amd64.deb

  print_success "Google Chrome $(google-chrome --version) installed"
}

# Install PM2
install_pm2() {
  print_step "STEP 7: Installing PM2 Process Manager"

  if command -v pm2 &> /dev/null; then
    print_warning "PM2 already installed"
    npm install -g pm2@latest
  else
    npm install -g pm2
  fi

  # Setup PM2 startup
  env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

  print_success "PM2 $(pm2 -v) installed"
}

# Setup application
setup_application() {
  print_step "STEP 8: Setting Up Application"

  # Clone repository first
  if [ -d "$APP_DIR/.git" ]; then
    print_warning "Repository exists, pulling latest..."
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
  else
    print_warning "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR" || {
      print_error "Failed to clone repository"
      print_warning "Please set REPO_URL environment variable before running"
      exit 1
    }
    cd "$APP_DIR"
  fi

  print_success "Repository cloned/updated"

  # Create data directories after cloning
  mkdir -p "$APP_DIR/data/profiles"
  mkdir -p "$APP_DIR/data/uploads"
  mkdir -p "$APP_DIR/data/output/images"
  mkdir -p "$APP_DIR/logs"

  print_success "Data directories created"
}

# Install app dependencies
install_app_dependencies() {
  print_step "STEP 9: Installing Application Dependencies"

  cd "$APP_DIR"

  # Backend
  echo -e "${BLUE}Installing backend dependencies...${NC}"
  cd "$APP_DIR/backend"
  npm install --production
  print_success "Backend dependencies installed"

  # Frontend
  echo -e "${BLUE}Installing frontend dependencies...${NC}"
  cd "$APP_DIR/frontend"
  npm install
  print_success "Frontend dependencies installed"
}

# Build frontend
build_frontend() {
  print_step "STEP 10: Building Frontend"

  cd "$APP_DIR/frontend"
  npm run build

  print_success "Frontend built successfully"
}

# Configure environment
configure_environment() {
  print_step "STEP 11: Configuring Environment"

  if [ ! -f "$APP_DIR/backend/.env" ]; then
    cat > "$APP_DIR/backend/.env" <<EOF
# Environment
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

# Job Configuration
JOB_ATTEMPTS=3
JOB_BACKOFF_DELAY=5000
IMAGE_GENERATION_TIMEOUT=120000

# Image Generation Settings
IMAGE_MODEL=IMAGEN_3_5
DEFAULT_ASPECT_RATIO=IMAGE_ASPECT_RATIO_LANDSCAPE
MEDIA_CATEGORY=MEDIA_CATEGORY_BOARD
EOF
    print_success "Environment file created"
  else
    print_warning "Environment file already exists, skipping..."
  fi
}

# Setup virtual display
setup_virtual_display() {
  print_step "STEP 12: Setting Up Virtual Display (Xvfb)"

  # Create systemd service for Xvfb
  cat > /etc/systemd/system/xvfb.service <<EOF
[Unit]
Description=X Virtual Frame Buffer Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable xvfb
  systemctl start xvfb

  print_success "Virtual display configured on :99"
}

# Configure Nginx
configure_nginx() {
  print_step "STEP 13: Configuring Nginx"

  # Use default domain (can be overridden with DOMAIN env var)
  echo -e "${BLUE}Using domain: ${DOMAIN}${NC}"
  echo -e "${YELLOW}To use custom domain, run: DOMAIN=yourdomain.com curl ... | sudo bash${NC}"

  cat > /etc/nginx/sites-available/$APP_NAME <<EOF
upstream backend {
  server 127.0.0.1:3000;
  keepalive 64;
}

server {
  listen 80;
  server_name $DOMAIN;

  client_max_body_size 10M;

  # Frontend (React SPA)
  location / {
    root $APP_DIR/frontend/dist;
    try_files \$uri \$uri/ /index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
  }

  # Backend API
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
    proxy_pass http://backend/api/health;
    access_log off;
  }
}
EOF

  # Enable site
  ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default

  # Test and reload
  nginx -t
  systemctl enable nginx
  systemctl restart nginx

  print_success "Nginx configured for $DOMAIN"
}

# Start application
start_application() {
  print_step "STEP 14: Starting Application"

  cd "$APP_DIR/backend"

  # Stop existing processes
  pm2 delete all 2>/dev/null || true

  # Start with PM2
  echo -e "${BLUE}Starting PM2 processes from: $(pwd)${NC}"
  pm2 start ecosystem.config.cjs

  # Wait for processes to start
  sleep 3

  # Verify processes are running
  RUNNING_PROCESSES=$(pm2 jlist | grep -c '"pm2_env"' || echo "0")
  if [ "$RUNNING_PROCESSES" -gt "0" ]; then
    pm2 save
    print_success "Application started with PM2 ($RUNNING_PROCESSES processes)"
  else
    print_error "PM2 processes failed to start!"
    pm2 logs --lines 50
    exit 1
  fi
}

# Configure firewall
configure_firewall() {
  print_step "STEP 15: Configuring Firewall"

  ufw --force enable
  ufw allow 22/tcp comment 'SSH'
  ufw allow 80/tcp comment 'HTTP'
  ufw allow 443/tcp comment 'HTTPS'

  print_success "Firewall configured"
}

# Health check
health_check() {
  print_step "STEP 16: Running Health Check"

  echo -e "${BLUE}Waiting for services to start...${NC}"
  sleep 5

  # Check services
  services=("mongod" "redis-server" "nginx" "xvfb")
  for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
      print_success "$service is running"
    else
      print_error "$service is NOT running"
    fi
  done

  # Check PM2
  echo ""
  pm2 status

  # Check API
  echo ""
  echo -e "${BLUE}Testing API endpoint...${NC}"
  sleep 3

  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    print_success "API is responding"
  else
    print_warning "API might still be starting, please wait..."
  fi
}

# Print completion
print_completion() {
  clear
  print_banner

  echo -e "${GREEN}"
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                                                              ║"
  echo "║          ✨ INSTALLATION COMPLETED! ✨                       ║"
  echo "║                                                              ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  echo -e "\n${CYAN}🌐 Access Information:${NC}"
  echo -e "   Frontend:  ${GREEN}http://$DOMAIN${NC}"
  echo -e "   Backend:   ${GREEN}http://$DOMAIN/api${NC}"
  echo -e "   Health:    ${GREEN}http://$DOMAIN/health${NC}"

  echo -e "\n${CYAN}📁 Installation Details:${NC}"
  echo -e "   App Dir:   ${GREEN}$APP_DIR${NC}"
  echo -e "   Logs:      ${GREEN}$APP_DIR/logs${NC}"
  echo -e "   Data:      ${GREEN}$APP_DIR/data${NC}"

  echo -e "\n${CYAN}🔧 Useful Commands:${NC}"
  echo -e "   View logs:       ${YELLOW}pm2 logs${NC}"
  echo -e "   Restart all:     ${YELLOW}pm2 restart all${NC}"
  echo -e "   Stop all:        ${YELLOW}pm2 stop all${NC}"
  echo -e "   Show status:     ${YELLOW}pm2 status${NC}"
  echo -e "   Monitor:         ${YELLOW}pm2 monit${NC}"
  echo -e "   Update app:      ${YELLOW}cd $APP_DIR && ./update.sh${NC}"

  echo -e "\n${CYAN}📚 Next Steps:${NC}"
  echo -e "   1. Configure domain DNS to point to this server"
  echo -e "   2. Install SSL certificate:"
  echo -e "      ${YELLOW}apt-get install certbot python3-certbot-nginx${NC}"
  echo -e "      ${YELLOW}certbot --nginx -d $DOMAIN${NC}"
  echo -e "   3. Review environment variables:"
  echo -e "      ${YELLOW}nano $APP_DIR/backend/.env${NC}"
  echo -e "   4. Import accounts CSV via web interface"

  echo -e "\n${CYAN}⚡ Quick Test:${NC}"
  echo -e "   ${YELLOW}curl http://localhost/api/health${NC}"

  echo -e "\n${GREEN}Installation completed successfully! 🎉${NC}\n"
}

# Main installation
main() {
  print_banner

  check_root
  detect_ubuntu
  system_update
  install_dependencies
  install_nodejs
  install_mongodb
  install_redis
  install_chrome
  install_pm2
  setup_application
  install_app_dependencies
  build_frontend
  configure_environment
  setup_virtual_display
  configure_nginx
  start_application
  configure_firewall
  health_check
  print_completion
}

# Run installation
main
