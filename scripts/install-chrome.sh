#!/bin/bash
# Install Google Chrome on Ubuntu Server

echo "============================================"
echo "Installing Google Chrome Stable"
echo "============================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or with sudo"
    exit 1
fi

# Update package list
echo "→ Updating package list..."
apt-get update -qq

# Install dependencies
echo "→ Installing dependencies..."
apt-get install -y wget gnupg2 apt-transport-https ca-certificates

# Download Chrome
echo "→ Downloading Chrome..."
cd /tmp
wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb

# Install Chrome
echo "→ Installing Chrome..."
dpkg -i google-chrome-stable_current_amd64.deb

# Fix dependencies if needed
echo "→ Fixing dependencies..."
apt-get install -f -y

# Clean up
rm -f google-chrome-stable_current_amd64.deb

# Verify installation
if command -v google-chrome &> /dev/null; then
    echo "✓ Chrome installed successfully!"
    google-chrome --version
else
    echo "✗ Chrome installation failed!"
    exit 1
fi

echo "============================================"
echo "Chrome installation complete!"
echo "============================================"