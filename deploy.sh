#!/bin/bash
# VorzaIQ — Hetzner deployment script
# Gebruik: ./deploy.sh vorzaiq.com
set -e

DOMAIN="${1:-JOUW_DOMEIN}"

echo "======================================"
echo " VorzaIQ Deploy — $DOMAIN"
echo "======================================"

# ── Stap 1: Controleer .env ──────────────────────────────────────────────────
if [ ! -f .env ]; then
    echo "❌ .env bestand niet gevonden!"
    echo "   Kopieer .env.example naar .env en vul alle waarden in:"
    echo "   cp .env.example .env && nano .env"
    exit 1
fi

# ── Stap 2: Installeer Docker als dat nog niet is ────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "→ Docker installeren..."
    curl -fsSL https://get.docker.com | sh
    apt-get install -y docker-compose-plugin
fi

# ── Stap 3: SSL certificaat aanvragen (eerste keer) ──────────────────────────
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "→ SSL certificaat aanvragen voor $DOMAIN en api.$DOMAIN..."

    # Start nginx tijdelijk op poort 80 (zonder SSL) voor ACME challenge
    apt-get install -y certbot
    certbot certonly --standalone \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        -d "api.$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "admin@$DOMAIN"
    echo "✓ SSL certificaat aangemaakt"
fi

# ── Stap 4: Vervang JOUW_DOMEIN in nginx config ──────────────────────────────
sed -i "s/JOUW_DOMEIN/$DOMAIN/g" nginx/nginx.conf
echo "✓ Nginx config bijgewerkt voor $DOMAIN"

# ── Stap 5: Pull latest code ─────────────────────────────────────────────────
echo "→ Code updaten..."
git pull origin main

# ── Stap 6: Build en start containers ───────────────────────────────────────
echo "→ Docker containers bouwen en starten..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d

# ── Stap 7: Status check ─────────────────────────────────────────────────────
echo ""
echo "======================================"
echo " Status"
echo "======================================"
docker compose ps

echo ""
echo "✅ Deploy klaar!"
echo "   Frontend: https://$DOMAIN"
echo "   Backend:  https://api.$DOMAIN"
echo "   API docs: https://api.$DOMAIN/docs"
