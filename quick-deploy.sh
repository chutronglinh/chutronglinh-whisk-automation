#!/bin/bash

#############################################
# QUICK DEPLOYMENT - Minimal Setup
# For clean Ubuntu 20.04/22.04 server
#############################################

set -e

# Download and run full deployment script
echo "🚀 Starting Whisk Automation deployment..."
echo ""
echo "This will:"
echo "  ✓ Install all dependencies (Node.js, MongoDB, Redis, Chrome)"
echo "  ✓ Clone your repository"
echo "  ✓ Build and configure the application"
echo "  ✓ Set up Nginx reverse proxy"
echo "  ✓ Start all services"
echo ""

read -p "Continue? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Deployment cancelled."
  exit 0
fi

# Check if we're on the server or need to download
if [ -f "./deploy.sh" ]; then
  chmod +x ./deploy.sh
  sudo ./deploy.sh
else
  # Download from repository
  echo "Downloading deployment script..."
  read -p "Enter your GitHub raw file URL for deploy.sh: " SCRIPT_URL

  if [ -z "$SCRIPT_URL" ]; then
    echo "Error: Script URL required"
    exit 1
  fi

  curl -fsSL "$SCRIPT_URL" | sudo bash
fi
