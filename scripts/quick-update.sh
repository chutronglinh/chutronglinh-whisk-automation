#!/bin/bash
# Quick update backend or frontend only

set -e

cd /opt/whisk-automation

echo "What do you want to update?"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both"
read -p "Choice (1/2/3): " choice

case $choice in
    1)
        echo "Updating backend..."
        cd backend
        git pull origin main
        npm install
        pm2 restart all
        echo "✅ Backend updated!"
        ;;
    2)
        echo "Updating frontend..."
        cd frontend
        git pull origin main
        npm install
        npm run build
        sudo systemctl restart nginx
        echo "✅ Frontend updated!"
        ;;
    3)
        echo "Updating both..."
        ./deployment/deploy.sh
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac