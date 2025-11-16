# Whisk Automation - Server Deployment Guide

## 🚀 Quick Setup (Fresh Ubuntu Server)

### Prerequisites
- Ubuntu 24.04 LTS (or 22.04, 20.04)
- Root/sudo access
- Minimum 2GB RAM, 20GB disk space
- Internet connection

### One-Command Setup
```bash
# Clone repository
git clone https://github.com/chutronglinh/whisk-automation.git
cd whisk-automation

# Run setup script (installs everything)
sudo bash scripts/setup-server.sh
```

**What it installs:**
- ✅ Node.js 20
- ✅ MongoDB 7.0
- ✅ Redis
- ✅ Google Chrome Stable
- ✅ Xvfb (Virtual Display)
- ✅ PM2 Process Manager
- ✅ Project dependencies
- ✅ All services configured and started

**Time:** ~10-15 minutes

---

## 🔧 Manual Installation

### 1. Install Chrome Only
```bash
sudo bash scripts/install-chrome.sh
```

### 2. Verify Chrome Installation
```bash
which google-chrome
google-chrome --version
```

Expected output: `Google Chrome 131.x.x.x`

---

## 📋 Post-Installation

### Check All Services
```bash
# MongoDB
sudo systemctl status mongod

# Redis
sudo systemctl status redis-server

# Xvfb (Virtual Display)
sudo systemctl status xvfb

# PM2 Applications
pm2 list
pm2 logs
```

### Access Application
```bash
# Get server IP
hostname -I

# Access in browser
http://YOUR_SERVER_IP:3000
```

### Configure Firewall (if needed)
```bash
# Allow port 3000
sudo ufw allow 3000/tcp

# Check status
sudo ufw status
```

---

## 🔄 Update Application

### Pull Latest Changes
```bash
cd /opt/whisk-automation
git pull origin main

# Install new dependencies (if any)
cd backend
npm install

# Restart application
pm2 restart all

# Check logs
pm2 logs --lines 20
```

---

## 🐛 Troubleshooting

### Chrome not found
```bash
# Reinstall Chrome
sudo bash scripts/install-chrome.sh

# Verify installation
which google-chrome
google-chrome --version
```

### Xvfb not running
```bash
# Start Xvfb
sudo systemctl start xvfb

# Enable on boot
sudo systemctl enable xvfb

# Check status
sudo systemctl status xvfb

# Check display
ps aux | grep Xvfb
```

### PM2 not starting
```bash
# Set DISPLAY variable
export DISPLAY=:99

# Restart PM2
pm2 restart all

# Check logs for errors
pm2 logs --err --lines 50
```

### MongoDB connection failed
```bash
# Start MongoDB
sudo systemctl start mongod

# Check status
sudo systemctl status mongod

# Check logs
sudo tail -50 /var/log/mongodb/mongod.log
```

### Redis connection failed
```bash
# Start Redis
sudo systemctl start redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

### Worker crashes immediately
```bash
# Check Chrome executable
which google-chrome

# Test Chrome manually
export DISPLAY=:99
google-chrome --version

# Check worker logs
pm2 logs whisk-worker-simple-login --lines 50
```

---

## 🔐 Security Recommendations

### 1. Setup Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw enable
```

### 2. Create Non-Root User
```bash
# Create user
sudo adduser whisk

# Add to sudo group
sudo usermod -aG sudo whisk

# Switch user
su - whisk
```

### 3. Setup SSH Key Authentication
```bash
# On local machine
ssh-keygen -t ed25519

# Copy to server
ssh-copy-id whisk@YOUR_SERVER_IP
```

---

## 📊 Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Web-based monitoring (optional)
pm2 install pm2-server-monit
```

### System Resources
```bash
# CPU and Memory
htop

# Disk usage
df -h

# Check specific process
ps aux | grep node
```

---

## 🔄 Backup & Restore

### Backup Database
```bash
# Backup MongoDB
mongodump --db whisk-automation --out /backup/mongodb/$(date +%Y%m%d)

# Backup profiles
tar -czf /backup/profiles-$(date +%Y%m%d).tar.gz /opt/whisk-automation/data/profiles
```

### Restore Database
```bash
# Restore MongoDB
mongorestore --db whisk-automation /backup/mongodb/20251116

# Restore profiles
tar -xzf /backup/profiles-20251116.tar.gz -C /
```

---

## 📝 Environment Variables

File: `/opt/whisk-automation/backend/.env`
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/whisk-automation
REDIS_HOST=localhost
REDIS_PORT=6379
PROFILE_PATH=/opt/whisk-automation/data/profiles
DISPLAY=:99
CHROME_PATH=/usr/bin/google-chrome
```

---

## 🆘 Support

### Logs Location

- PM2 Logs: `/opt/whisk-automation/backend/logs/`
- MongoDB Logs: `/var/log/mongodb/mongod.log`
- Redis Logs: `/var/log/redis/redis-server.log`
- System Logs: `journalctl -u xvfb`

### Common Commands
```bash
# Restart everything
pm2 restart all

# Stop everything
pm2 stop all

# Delete all PM2 processes
pm2 delete all

# Flush PM2 logs
pm2 flush

# Start fresh
cd /opt/whisk-automation/backend
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Puppeteer Documentation](https://pptr.dev/)