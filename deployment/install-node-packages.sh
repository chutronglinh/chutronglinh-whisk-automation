#!/bin/bash
# Install Node.js packages for backend and frontend

set -e

cd /opt/whisk-automation

echo "Installing Node.js packages..."

# Install backend packages
echo "📦 Installing backend packages..."
cd backend
npm install --production

# Install frontend packages
echo "📦 Installing frontend packages..."
cd ../frontend
npm install

echo "✅ All Node.js packages installed!"