# 🚀 WHISK AUTOMATION - HƯỚNG DẪN DEPLOY

## 📋 Yêu Cầu Hệ Thống

- **OS**: Ubuntu 20.04/22.04/24.04 LTS
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB)
- **Disk**: Tối thiểu 20GB
- **CPU**: 2 cores trở lên
- **Network**: Kết nối internet ổn định

---

## ⚡ DEPLOY NHANH (1 LỆNH DUY NHẤT)

### Bước 1: SSH vào server Ubuntu

```bash
ssh root@your-server-ip
```

### Bước 2: Chạy lệnh cài đặt

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/whisk-automation/main/install.sh | sudo bash
```

**Thay `YOUR_USERNAME` bằng username GitHub của bạn!**

### Bước 3: Nhập thông tin khi được hỏi

- **Repository URL**: Nhập URL repo GitHub của bạn
- **Domain**: Nhập domain hoặc để trống cho localhost

### ✅ Xong! Hệ thống đã sẵn sàng!

---

## 📦 Script Cài Đặt Sẽ TỰ ĐỘNG:

✓ Cập nhật hệ thống Ubuntu
✓ Cài đặt Node.js 20
✓ Cài đặt MongoDB 7.0
✓ Cài đặt Redis
✓ Cài đặt Google Chrome
✓ Cài đặt PM2 process manager
✓ Cài đặt Nginx reverse proxy
✓ Cài đặt Xvfb (virtual display)
✓ Clone repository
✓ Cài đặt tất cả dependencies
✓ Build frontend
✓ Cấu hình environment
✓ Khởi động tất cả services
✓ Cấu hình firewall

---

## 🌐 TRUY CẬP HỆ THỐNG

Sau khi cài đặt hoàn tất:

- **Frontend**: `http://your-server-ip` hoặc `http://your-domain.com`
- **Backend API**: `http://your-server-ip/api`
- **Health Check**: `http://your-server-ip/health`

---

## 🔧 QUẢN LÝ HỆ THỐNG

### Xem logs
```bash
pm2 logs
```

### Xem trạng thái
```bash
pm2 status
```

### Restart toàn bộ
```bash
pm2 restart all
```

### Stop toàn bộ
```bash
pm2 stop all
```

### Monitor realtime
```bash
pm2 monit
```

### Update code mới nhất
```bash
cd /opt/whisk-automation
./update.sh
```

---

## 🔐 CẤU HÌNH SSL (HTTPS)

### Bước 1: Cài đặt Certbot
```bash
apt-get install -y certbot python3-certbot-nginx
```

### Bước 2: Tạo SSL certificate
```bash
certbot --nginx -d your-domain.com
```

### Bước 3: Auto-renew
```bash
certbot renew --dry-run
```

Certificate sẽ tự động gia hạn mỗi 90 ngày.

---

## ⚙️ CẤU HÌNH NÂNG CAO

### Chỉnh sửa Environment Variables
```bash
nano /opt/whisk-automation/backend/.env
```

### Chỉnh sửa Nginx Config
```bash
nano /etc/nginx/sites-available/whisk-automation
nginx -t
systemctl restart nginx
```

### Xem logs MongoDB
```bash
journalctl -u mongod -f
```

### Xem logs Redis
```bash
journalctl -u redis-server -f
```

### Xem logs Nginx
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

---

## 🐛 TROUBLESHOOTING

### API không hoạt động
```bash
# Kiểm tra backend có chạy không
pm2 status

# Restart backend
pm2 restart whisk-api

# Xem logs lỗi
pm2 logs whisk-api --err
```

### MongoDB không kết nối được
```bash
# Kiểm tra trạng thái
systemctl status mongod

# Restart MongoDB
systemctl restart mongod

# Xem logs
journalctl -u mongod -n 50
```

### Redis không hoạt động
```bash
# Kiểm tra trạng thái
systemctl status redis-server

# Test kết nối
redis-cli ping

# Restart
systemctl restart redis-server
```

### Chrome/Puppeteer lỗi
```bash
# Kiểm tra Xvfb
systemctl status xvfb

# Restart Xvfb
systemctl restart xvfb

# Test Chrome
DISPLAY=:99 google-chrome --version
```

### Nginx lỗi 502 Bad Gateway
```bash
# Kiểm tra backend có chạy không
pm2 status

# Test backend trực tiếp
curl http://localhost:3000/api/health

# Restart Nginx
systemctl restart nginx
```

---

## 🔄 UPDATE HỆ THỐNG

### Update tự động
```bash
cd /opt/whisk-automation
./update.sh
```

### Update thủ công
```bash
cd /opt/whisk-automation
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart all
```

---

## 📁 CẤU TRÚC THƯ MỤC

```
/opt/whisk-automation/
├── backend/                 # Backend Node.js
│   ├── src/                # Source code
│   ├── .env               # Environment variables
│   └── ecosystem.config.cjs # PM2 config
├── frontend/               # Frontend React
│   ├── src/               # Source code
│   └── dist/              # Built files (served by Nginx)
├── data/                  # Application data
│   ├── profiles/         # Chrome user profiles
│   ├── uploads/          # Uploaded files
│   └── output/           # Generated images
├── logs/                  # Application logs
├── install.sh            # Installation script
└── update.sh             # Update script
```

---

## 🔒 BẢO MẬT

### Thay đổi MongoDB password (khuyến nghị)
```bash
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "your-strong-password",
  roles: [ { role: "root", db: "admin" } ]
})
```

Sau đó update `MONGODB_URI` trong `.env`:
```
MONGODB_URI=mongodb://admin:your-strong-password@localhost:27017/whisk-automation?authSource=admin
```

### Thay đổi Redis password
```bash
nano /etc/redis/redis.conf
# Thêm dòng: requirepass your-redis-password
systemctl restart redis-server
```

Update `.env`:
```
REDIS_PASSWORD=your-redis-password
```

### Cấu hình UFW firewall
```bash
ufw status
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

---

## 📊 MONITORING

### Xem resource usage
```bash
pm2 monit
htop
```

### Setup monitoring dashboard (optional)
```bash
pm2 install pm2-server-monit
```

### Backup MongoDB
```bash
mongodump --out=/opt/whisk-automation/backups/$(date +%Y%m%d)
```

### Restore MongoDB
```bash
mongorestore /opt/whisk-automation/backups/20240101
```

---

## 🎯 PRODUCTION CHECKLIST

- [ ] SSL certificate đã cài đặt
- [ ] MongoDB password đã đổi
- [ ] Redis password đã cài (nếu cần)
- [ ] Firewall đã cấu hình
- [ ] Domain DNS đã trỏ đúng
- [ ] Backup script đã setup
- [ ] Monitoring đã cài đặt
- [ ] Environment variables đã review
- [ ] PM2 startup đã enable
- [ ] Nginx access/error logs rotation

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:

1. Xem logs: `pm2 logs`
2. Kiểm tra service status
3. Review environment variables
4. Check firewall rules
5. Test từng service riêng lẻ

---

## 📝 GHI CHÚ

- Hệ thống sử dụng PM2 để quản lý processes
- Nginx làm reverse proxy và serve static files
- MongoDB không authentication mặc định (cần cấu hình thêm)
- Redis không password mặc định (khuyến nghị thêm)
- Xvfb chạy virtual display trên :99 cho Puppeteer
- Logs PM2 được lưu tự động trong `/opt/whisk-automation/logs`

---

**🎉 Chúc deploy thành công!**
