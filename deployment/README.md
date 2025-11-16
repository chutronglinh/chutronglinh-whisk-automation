# Whisk Automation - Deployment Guide

Complete deployment system for Whisk Automation on Ubuntu 24.04 server.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Fresh Server Setup](#fresh-server-setup)
- [Update Existing Server](#update-existing-server)
- [Full System Reset](#full-system-reset)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## 🚀 Quick Start

### Prerequisites

- Ubuntu 24.04 LTS server
- Sudo access
- Internet connection

### Option 1: Fresh Server (First Time)
```bash
# Clone repository
git clone https://github.com/chutronglinh/whisk-automation.git
cd whisk-automation

# Run setup (installs everything)
chmod +x deployment/setup-server.sh
./deployment/setup-server.sh
```

**What it installs:**
- Node.js 18.x
- MongoDB 7.0
- Redis
- Nginx
- PM2
- Google Chrome
- All dependencies

**Time:** ~10-15 minutes

---

## 🆕 Fresh Server Setup

### Step-by-Step

1. **Clone Repository**
```bash
   git clone https://github.com/chutronglinh/whisk-automation.git
   cd whisk-automation
```

2. **Run Setup Script**
```bash
   chmod +x deployment/setup-server.sh
   ./deployment/setup-server.sh
```

3. **Verify Installation**
```bash
   # Check PM2 processes
   pm2 list
   
   # Check services
   sudo systemctl status nginx
   sudo systemctl status mongod
   sudo systemctl status redis-server
```

4. **Access Application**
   - Frontend: `http://YOUR_SERVER_IP/accounts`
   - API: `http://YOUR_SERVER_IP/api/accounts`

---

## 🔄 Update Existing Server

### Regular Code Update (Keeps Data)
```bash
cd /opt/whisk-automation
./deployment/deploy.sh
```

**What it does:**
- Pulls latest code
- Installs new dependencies
- Builds frontend
- Restarts PM2 processes
- Keeps all data (database, profiles, logs)

**Time:** ~2-3 minutes

---

## 🔥 Full System Reset

### ⚠️ WARNING: Deletes All Data!

Use this when you want to start completely fresh.
```bash
cd /opt/whisk-automation
./deployment/reset-and-deploy.sh
```

**You will be asked to type:** `DELETE-EVERYTHING`

**What it deletes:**
- All MongoDB databases
- All Redis cache
- All Chrome profiles
- All logs and output
- PM2 processes

**What it keeps:**
- System packages (Node.js, MongoDB, etc.)
- Source code
- Configuration files

**Time:** ~5 minutes

---

## 🔧 Troubleshooting

## 🔧 Common Permission Issues

### Issue: "Permission denied" when running scripts

**Solution:**
```bash
cd /opt/whisk-automation
bash deployment/fix-permissions.sh
```

### Issue: "EACCES: permission denied" during build

**Solution:**
```bash
# Quick fix
sudo rm -rf frontend/dist
bash deployment/deploy.sh

# Permanent fix
bash deployment/fix-permissions.sh
```

### Issue: Git detects file permission changes

**Solution:**
```bash
cd /opt/whisk-automation
git config core.filemode false
```

### Issue: Files owned by root after git pull

**Cause:** Running `sudo git pull` creates root-owned files

**Solution:**
```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/whisk-automation

# Always pull without sudo
git pull origin main  # ✅ Correct
sudo git pull origin main  # ❌ Wrong
```

### Automated Fix Script

Run this anytime you encounter permission issues:
```bash
cd /opt/whisk-automation
bash deployment/fix-permissions.sh
```

This script will:
- Fix all file ownership
- Configure Git properly
- Make scripts executable
- Set up data directories
- Clean up problematic files

### PM2 Processes Not Starting
```bash
# Check logs
pm2 logs

# Restart all
pm2 restart all

# Delete and restart
pm2 delete all
cd /opt/whisk-automation/backend
pm2 start ecosystem.config.cjs
pm2 save
```

### Nginx Not Working
```bash
# Test configuration
sudo nginx -t

# Check status
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx

# Check logs
sudo tail -f /var/log/nginx/error.log
```

### MongoDB Connection Issues
```bash
# Check status
sudo systemctl status mongod

# Restart
sudo systemctl restart mongod

# Check logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh
```

### Frontend Not Updating
```bash
# Clear nginx cache
sudo rm -rf /var/cache/nginx/*

# Rebuild frontend
cd /opt/whisk-automation/frontend
npm run build

# Restart nginx
sudo systemctl restart nginx

# Hard refresh browser: Ctrl + Shift + R
```

### Worker Errors
```bash
# Check specific worker logs
pm2 logs whisk-worker-cookie --lines 50

# Restart specific worker
pm2 restart whisk-worker-cookie

# Delete and restart
pm2 delete whisk-worker-cookie
cd /opt/whisk-automation/backend
pm2 start ecosystem.config.cjs --only whisk-worker-cookie
```

---

## 🛠️ Maintenance

### View Logs
```bash
# All logs
pm2 logs

# Specific worker
pm2 logs whisk-worker-cookie

# Last 100 lines
pm2 logs --lines 100

# No stream (exit after showing)
pm2 logs --nostream
```

### Cleanup Old Data
```bash
cd /opt/whisk-automation
./scripts/cleanup.sh
```

**Clears:**
- PM2 logs
- Application logs
- Nginx cache
- npm cache
- Old profiles (30+ days)

### Monitor Resources
```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk usage
df -h
du -sh /opt/whisk-automation/*
```

### Database Backup
```bash
# Backup MongoDB
mongodump --db=whisk-automation --out=/backup/mongodb-$(date +%Y%m%d)

# Restore MongoDB
mongorestore --db=whisk-automation /backup/mongodb-20250116/whisk-automation
```

---

## 📊 Service Management

### PM2 Commands
```bash
pm2 list                    # List all processes
pm2 start ecosystem.config.cjs  # Start all
pm2 stop all               # Stop all
pm2 restart all            # Restart all
pm2 delete all             # Delete all
pm2 logs                   # View logs
pm2 monit                  # Monitor
pm2 save                   # Save current list
```

### System Services
```bash
# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
sudo systemctl stop nginx
sudo systemctl start nginx

# MongoDB
sudo systemctl status mongod
sudo systemctl restart mongod

# Redis
sudo systemctl status redis-server
sudo systemctl restart redis-server
```

---

## 🔐 Security (Optional)

### Enable MongoDB Authentication

1. Create admin user:
```bash
   mongosh
   use admin
   db.createUser({
     user: "admin",
     pwd: "your-strong-password",
     roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
   })
   exit
```

2. Enable auth in `/etc/mongod.conf`:
```yaml
   security:
     authorization: enabled
```

3. Restart MongoDB:
```bash
   sudo systemctl restart mongod
```

4. Update `.env`:
```env
   MONGODB_URI=mongodb://admin:your-strong-password@localhost:27017/whisk-automation?authSource=admin
```

### Setup Firewall
```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 📞 Support

- **Issues:** https://github.com/chutronglinh/whisk-automation/issues
- **Documentation:** Check individual script files for more details

---

## 📝 Script Reference

| Script | Purpose | Data Safe? |
|--------|---------|-----------|
| `setup-server.sh` | Fresh server installation | N/A |
| `deploy.sh` | Update code | ✅ Yes |
| `reset-and-deploy.sh` | Full reset + redeploy | ❌ No - Deletes all |
| `install-dependencies.sh` | Install system packages | ✅ Yes |
| `install-node-packages.sh` | Install npm packages | ✅ Yes |
| `git-push.sh` | Quick git push | ✅ Yes |
| `quick-update.sh` | Update backend/frontend only | ✅ Yes |
| `cleanup.sh` | Clean logs and cache | ✅ Yes |

---

## ✅ Checklist After Setup

- [ ] Can access frontend at http://YOUR_IP/accounts
- [ ] `pm2 list` shows all workers online
- [ ] Can import CSV accounts
- [ ] Can click "Login" button (Chrome opens)
- [ ] Can click "Get Cookie" button
- [ ] MongoDB stores data: `mongosh` → `use whisk-automation` → `db.accounts.find()`
- [ ] Nginx serves frontend
- [ ] All services auto-start on reboot

---

**Created by:** Linh Chu Trong  
**Last Updated:** 2025-11-16