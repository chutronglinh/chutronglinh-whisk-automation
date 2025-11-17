# Troubleshooting Guide

## Common Issues and Solutions

### PM2 Permission Errors (Chrome SingletonLock)

**Symptoms:**
```
Failed to create /opt/whisk-automation/data/profiles/XXX/SingletonLock: File exists (17)
Failed to create a ProcessSingleton for your profile directory
Permission denied (13)
```

**Root Cause:**
Multiple PM2 daemon instances running under different users (root and normal user), causing file permission conflicts in Chrome profile directories.

**How to Check:**
```bash
ps aux | grep PM2
```

If you see multiple lines like:
```
linh   29001  PM2 v6.0.13: God Daemon (/home/linh/.pm2)
root   30186  PM2 v6.0.13: God Daemon (/root/.pm2)
```

This means you have dual PM2 daemons running, which WILL cause permission errors.

**Solution:**

1. **Kill all PM2 instances:**
   ```bash
   pm2 kill
   sudo pm2 kill
   ```

2. **Kill all Chrome processes:**
   ```bash
   sudo pkill -9 chrome
   sudo pkill -9 Chrome
   ```

3. **Fix directory permissions:**
   ```bash
   sudo rm -rf /opt/whisk-automation/data/profiles/*
   sudo chown -R $USER:$USER /opt/whisk-automation/data
   sudo chown -R $USER:$USER /opt/whisk-automation/logs
   ```

4. **Restart PM2 (IMPORTANT: Do NOT use sudo!):**
   ```bash
   cd /opt/whisk-automation/backend
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

5. **Verify only ONE PM2 daemon is running:**
   ```bash
   ps aux | grep PM2
   ```
   You should see only ONE line with your username.

---

## Prevention

### NEVER Use `sudo pm2`

**CRITICAL RULE:** Never run PM2 commands with `sudo` unless you know exactly what you're doing.

**❌ WRONG:**
```bash
sudo pm2 start app.js
sudo pm2 restart all
sudo pm2 logs
```

**✅ CORRECT:**
```bash
pm2 start app.js
pm2 restart all
pm2 logs
```

**Why?**
- Running `sudo pm2` creates a PM2 daemon under the root user
- This causes Chrome profile directories to be owned by root
- When non-root PM2 tries to access these directories → permission denied
- Multiple PM2 daemons cause file lock conflicts

---

## Installation Best Practices

The install script (`install.sh`) has been updated to prevent this issue:

1. **Detects the actual user** (not root) who is running the script
2. **Sets up PM2 under the actual user**, not root
3. **Sets proper ownership** on data directories
4. **Kills existing PM2 daemons** before starting new ones

After installation, PM2 will run under your user account, preventing permission conflicts.

---

## If You Need to Reinstall

**Complete clean reinstall:**

```bash
# 1. Uninstall completely
curl -fsSL https://raw.githubusercontent.com/chutronglinh/chutronglinh-whisk-automation/main/uninstall.sh | sudo bash -s yes yes yes

# 2. Reinstall fresh
curl -fsSL https://raw.githubusercontent.com/chutronglinh/chutronglinh-whisk-automation/main/install.sh | sudo bash
```

The new install script will automatically:
- Set up PM2 under your user account
- Set correct permissions on all directories
- Prevent dual PM2 daemon issues

---

## Checking PM2 Status

**Always check PM2 status as your normal user:**

```bash
pm2 status
pm2 logs
```

**NOT as root:**
```bash
# ❌ Don't do this!
sudo pm2 status
```

---

## MongoDB Connection Issues

**Symptoms:**
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**

1. **Check if MongoDB is running:**
   ```bash
   sudo systemctl status mongod
   ```

2. **Start MongoDB if stopped:**
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

3. **Check MongoDB logs:**
   ```bash
   sudo tail -f /var/log/mongodb/mongod.log
   ```

---

## Redis Connection Issues

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**

1. **Check if Redis is running:**
   ```bash
   sudo systemctl status redis-server
   ```

2. **Start Redis if stopped:**
   ```bash
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   ```

---

## Chrome Not Opening on Desktop

**For Ubuntu Desktop (GUI) environments:**

If Chrome browser doesn't open for manual login, check X Server authorization:

```bash
xhost +local:
```

The install script automatically sets this up to run on login, but you may need to log out and log back in for it to take effect.

---

## API Not Responding

**Check backend logs:**
```bash
pm2 logs backend-api
```

**Check if backend is running:**
```bash
pm2 status
curl http://localhost:3000/api/health
```

**Restart backend:**
```bash
pm2 restart backend-api
```

---

## Nginx Configuration Issues

**Test Nginx configuration:**
```bash
sudo nginx -t
```

**Reload Nginx:**
```bash
sudo systemctl reload nginx
```

**Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

---

## Get Support

If you encounter issues not covered here:

1. Check PM2 logs: `pm2 logs`
2. Check system logs: `sudo journalctl -xe`
3. Create an issue on GitHub with:
   - Error messages
   - Output of `pm2 status`
   - Output of `ps aux | grep PM2`
   - Ubuntu version: `lsb_release -a`
