#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Updating apt packages..."
sudo apt update
sudo apt upgrade -y

echo "[2/4] Installing base packages..."
sudo apt install -y docker.io docker-compose-v2 git curl nginx certbot python3-certbot-nginx

echo "[3/4] Enabling Docker..."
sudo systemctl enable docker
sudo systemctl start docker

echo "[4/4] Done."
echo "Remember to open cloud firewall/security-group ports: 22, 80, 443"
