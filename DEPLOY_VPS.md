# Deploying BosDB to a VPS

This guide explains how to deploy your customized BosDB-Browser to a Linux VPS (Ubuntu).

## Prerequisites
1.  **A Cloud Server**: Ubuntu 22.04 or 24.04.
    - Recommended: **Oracle Cloud Always Free** (ARM/Ampere instance) or DigitalOcean/Hetzner.
2.  **Sudo Access**: You need root/sudo privileges on the server.

## Step 1: Prepare the Server
1.  SSH into your new server:
    ```bash
    ssh ubuntu@<YOUR_SERVER_IP>
    ```
2.  Copy the setup script content (or upload the file) and run it:
    ```bash
    # (Inside the server)
    nano setup_vps.sh
    # Paste content of scripts/setup_vps.sh
    chmod +x setup_vps.sh
    ./setup_vps.sh
    ```

## Step 2: Upload Your Code
From your **local machine** (where you are writing code), use `scp` to copy your project to the server.

```bash
# Run this on your LAPTOP
# Replace KeyPath and IP
scp -rdir \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  . ubuntu@<YOUR_SERVER_IP>:/opt/bosdb-browser
```

## Step 3: Start the App
1.  Back on the **server**:
    ```bash
    cd /opt/bosdb-browser
    
    # Start the app
    sudo docker compose -f docker-compose.deploy.yml up -d --build
    ```

2.  Check logs:
    ```bash
    sudo docker logs -f bosdb-app
    ```

## Step 4: Expose to Internet
You have two options:

### Option A: Cloudflare Tunnel (Recommended)
Install `cloudflared` on the VPS just like you did locally.
```bash
# On Server
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Run Quick Tunnel
cloudflared tunnel --url http://localhost:3000
```

### Option B: Cloudflare Tunnel (Persistent)
If you have a domain name on Cloudflare, use `cloudflared tunnel login` on the server and configure a permanent customized hostname (e.g., `db.yourdomain.com`).
