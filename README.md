# Whisk Automation System

Automated image generation system using Google Whisk with web-based management interface.

## Features

- ✅ Web-based dashboard
- ✅ Multi-account management
- ✅ Automated Chrome profile setup
- ✅ Session cookie extraction
- ✅ Batch project creation
- ✅ Automated image generation
- ✅ Real-time job monitoring
- ✅ Queue-based processing

## Tech Stack

**Backend:**
- Node.js + Express
- MongoDB (database)
- Redis (queue)
- Bull (job queue)
- Socket.io (real-time)
- Puppeteer (automation)

**Frontend:**
- React 18 + Vite
- TailwindCSS
- React Router
- Zustand (state)
- Socket.io-client

## Installation

### Quick Install (Ubuntu Server)

```bash
# SSH into your server
ssh user@your-server-ip

# Run installer
curl -fsSL https://raw.githubusercontent.com/yourusername/whisk-automation/main/scripts/install.sh | sudo bash
```

### Manual Install

```bash
# Clone repository
git clone https://github.com/yourusername/whisk-automation.git
cd whisk-automation

# Install backend
cd backend
npm install
cp .env.example .env
# Edit .env with your settings

# Install frontend
cd ../frontend
npm install

# Start development
npm run dev  # Frontend (port 5173)
cd ../backend
npm run dev  # Backend (port 3000)
```

## Production Deployment

```bash
# Build frontend
cd frontend
npm run build

# Deploy to nginx
sudo cp -r dist/* /var/www/whisk-frontend/

# Start backend with PM2
cd ../backend
pm2 start ecosystem.config.js
pm2 save
```

## Update Deployment

```bash
# Run deploy script
sudo bash scripts/deploy.sh
```

## Usage

1. **Access Dashboard**: `http://your-server-ip`

2. **Import Accounts**:
   - Go to Accounts page
   - Click "Import JSON"
   - Upload `accounts.json`

3. **Setup Profiles**:
   - Manual login required for each account
   - Run on server with GUI access

4. **Extract Cookies**:
   - Click "Extract Cookie" for each account
   - Automated via headless browser

5. **Create Projects**:
   - Select accounts
   - Specify projects per account
   - Automated creation

6. **Generate Images**:
   - Upload prompts (JSON file or manual)
   - Select prompts and accounts
   - Configure settings
   - Start generation

## API Endpoints

```
GET    /api/accounts
POST   /api/accounts/import
POST   /api/accounts/:id/extract-cookie

GET    /api/projects
POST   /api/projects/create

GET    /api/prompts
POST   /api/prompts/upload

GET    /api/jobs
GET    /api/jobs/stats
POST   /api/jobs/generate

GET    /api/images
GET    /api/images/:id/download
```

## Directory Structure

```
/opt/whisk-automation/
├── backend/          # Backend API
├── frontend/         # Frontend app
├── data/
│   ├── profiles/    # Chrome profiles
│   ├── output/      # Generated images
│   └── uploads/     # User uploads
└── logs/            # Application logs
```

## Management Commands

```bash
# View logs
pm2 logs

# List processes
pm2 list

# Restart
pm2 restart all

# Monitor
pm2 monit

# Stop
pm2 stop all
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `MONGODB_URI` - MongoDB connection
- `REDIS_HOST` - Redis host
- `OUTPUT_PATH` - Image output directory
- `PROFILE_PATH` - Chrome profiles directory

## Troubleshooting

**MongoDB not connecting:**
```bash
sudo systemctl status mongod
sudo systemctl restart mongod
```

**Redis issues:**
```bash
sudo systemctl status redis-server
sudo systemctl restart redis-server
```

**Backend not starting:**
```bash
pm2 logs whisk-api
```

**Frontend not loading:**
```bash
sudo systemctl status nginx
sudo nginx -t
```

## License

ISC