# Deployment Guide

## 🎯 Môi trường

### Development (Port 5173)
- Hot reload tự động
- Debug dễ dàng
- Dùng khi đang code

### Production (Port 80)
- Tối ưu hiệu năng
- URL chuẩn (không cần port)
- Dùng khi deploy chính thức

---

## 📋 Các lệnh deploy

### 1. Deploy Production (Full)
```bash
ssh linh@192.168.163.149
cd /opt/whisk-automation
sudo chmod +x deploy.sh
./deploy.sh prod
```

**Lệnh này sẽ:**
- Pull code mới từ GitHub
- Install dependencies
- Build frontend (minify, optimize)
- Copy nginx config
- Reload nginx
- Restart backend PM2

**Thời gian:** ~1-2 phút

---

### 2. Quick Update (Chỉ restart)
```bash
ssh linh@192.168.163.149
cd /opt/whisk-automation
sudo chmod +x update.sh
./update.sh
```

**Lệnh này sẽ:**
- Pull code mới
- Restart backend PM2
- KHÔNG build frontend

**Thời gian:** ~10 giây

**Dùng khi:** Chỉ sửa backend, không sửa frontend

---

### 3. Development Mode

**Start dev server:**
```bash
ssh linh@192.168.163.149
cd /opt/whisk-automation/frontend
npm run dev
```

**Access:** `http://192.168.163.149:5173/`

---

## 🚀 Workflow đề xuất

### Khi develop:
1. Code trên Windows
2. Push lên GitHub
3. SSH vào server: `./update.sh`
4. Test trên dev server (port 5173)

### Khi release:
1. Code đã stable
2. Push lên GitHub
3. SSH vào server: `./deploy.sh prod`
4. Test trên production (port 80)

---

## 🔧 First Time Setup

**Một lần duy nhất khi setup server mới:**

```bash
# Install nginx
sudo apt update
sudo apt install nginx

# Enable nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Make scripts executable
cd /opt/whisk-automation
sudo chmod +x deploy.sh update.sh

# First deployment
./deploy.sh prod
```

---

## ⚡ Ports

| Service | Port | URL |
|---------|------|-----|
| Production (Nginx) | 80 | http://192.168.163.149 |
| Development (Vite) | 5173 | http://192.168.163.149:5173 |
| Backend API | 3000 | http://192.168.163.149:3000 |

---

## 📝 Logs

**Nginx logs:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**PM2 logs:**
```bash
sudo pm2 logs
sudo pm2 logs whisk-api
sudo pm2 logs whisk-worker-image
```

---

## 🛠️ Troubleshooting

**Frontend không load:**
```bash
# Check nginx status
sudo systemctl status nginx

# Reload nginx
sudo systemctl reload nginx

# Check if build exists
ls -la /opt/whisk-automation/frontend/dist
```

**Backend lỗi:**
```bash
# Check PM2 status
sudo pm2 status

# Restart all
sudo pm2 restart all

# Check logs
sudo pm2 logs --lines 100
```

**Permission errors:**
```bash
# Fix ownership
sudo chown -R linh:linh /opt/whisk-automation

# Fix build directory
sudo chown -R www-data:www-data /opt/whisk-automation/frontend/dist
```
