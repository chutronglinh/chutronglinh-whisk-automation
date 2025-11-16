#!/bin/bash
# Install all system dependencies

set -e

echo "Installing system dependencies..."

# Update package list
sudo apt update -qq

# Install basic tools
echo "Installing basic tools..."
sudo apt install -y curl wget git build-essential software-properties-common

# Install Node.js 18.x
echo "Installing Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install MongoDB 7.0
echo "Installing MongoDB 7.0..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update -qq
    sudo apt install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi

# Install Redis
echo "Installing Redis..."
if ! command -v redis-cli &> /dev/null; then
    sudo apt install -y redis-server
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
fi

# Install Nginx
echo "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Install Google Chrome (for Puppeteer)
echo "Installing Google Chrome..."
if ! command -v google-chrome &> /dev/null; then
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
    sudo apt update -qq
    sudo apt install -y google-chrome-stable
fi

# Install Chrome dependencies for Puppeteer
echo "Installing Chrome dependencies..."
sudo apt install -y \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libxshmfence1

# Install PM2 globally
echo "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Install X11 for Chrome display
echo "Installing X11..."
sudo apt install -y xvfb x11vnc xdotool

echo "✅ All system dependencies installed!"