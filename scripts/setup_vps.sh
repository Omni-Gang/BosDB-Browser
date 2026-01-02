#!/bin/bash

# BosDB-Browser VPS Setup Script
# Works on Ubuntu 20.04 / 22.04 / 24.04

set -e

echo "🚀 Starting BosDB VPS Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "✅ Docker is already installed."
fi

# 3. Setup Project Directory
APP_DIR="/opt/bosdb-browser"
echo "📂 Setting up directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# 4. Clone/Copy instructions
echo "----------------------------------------------------------------"
echo "✅ Server Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Upload your code to this server."
echo "   (You can use scp or git if you push your code to GitHub first)"
echo ""
echo "2. Navigate to the folder:"
echo "   cd $APP_DIR"
echo ""
echo "3. Run the deployment:"
echo "   docker compose -f docker-compose.deploy.yml up -d --build"
echo "----------------------------------------------------------------"
