#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Container status"
docker compose -f deploy/docker-compose.prod.yml ps

echo
echo "[2/4] Local nginx root"
curl -I http://127.0.0.1 || true

echo
echo "[3/4] API home"
curl http://127.0.0.1/home || true

echo
echo "[4/4] Finished. If you configured domains, also test:"
echo "  https://admin.yourdomain.com"
echo "  https://m.yourdomain.com"
echo "  https://api.yourdomain.com/home"
