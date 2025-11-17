# 🎨 Whisk Automation

> Automated Google Whisk Image Generation System

Hệ thống tự động tạo hình ảnh sử dụng Google Whisk AI với khả năng quản lý nhiều tài khoản, queue processing và batch generation.

---

## ✨ Tính Năng

- 🤖 **Tự động tạo hình ảnh** với Google Whisk AI (Imagen 3.5)
- 👥 **Quản lý nhiều tài khoản** Google
- 📝 **Quản lý prompts** với phân loại và thống kê
- 🗂️ **Quản lý projects** cho từng tài khoản
- ⚡ **Queue-based processing** với Bull & Redis
- 🔄 **Batch generation** - Tạo hàng loạt hình ảnh
- 🖼️ **Image gallery** - Xem và tải về hình ảnh đã tạo
- 📊 **Dashboard & Statistics** - Theo dõi tiến độ realtime
- 🔐 **Session management** - Tự động login và quản lý cookie
- 🚀 **PM2 clustering** - Auto-scale workers

---

## 🚀 Deploy Nhanh (1 Lệnh)

### Trên Ubuntu Server:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/whisk-automation/main/install.sh | sudo bash
```

**Thay `YOUR_USERNAME` bằng username GitHub của bạn!**

👉 **Xem hướng dẫn chi tiết:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📖 Hướng Dẫn Nhanh

1. **Clone repository**
2. **Chạy install.sh trên Ubuntu server**
3. **Truy cập http://your-server-ip**
4. **Import accounts CSV**
5. **Bắt đầu generate!**

---

## 🔧 Quản Lý Hệ Thống

```bash
pm2 logs                # Xem logs
pm2 restart all         # Restart
./update.sh             # Update code mới
```

---

## 📄 License

MIT License

---

**🚀 Happy Automating!**
