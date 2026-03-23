#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ItsPeanuts AI — Hetzner VPS Setup Script
# Uitvoeren als root op een verse Ubuntu 22.04 server:
#   bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

REPO="https://github.com/ItsPeanuts/its-peanuts-ai.git"
APP_DIR="/opt/its-peanuts"
DB_NAME="its_peanuts"
DB_USER="peanuts_user"
DB_PASS=$(openssl rand -base64 20 | tr -d '/+=')
JWT_SECRET=$(openssl rand -base64 32)
SERVER_IP=$(curl -4 -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo "======================================"
echo "  ItsPeanuts AI — Server Setup"
echo "======================================"
echo "Server IP: $SERVER_IP"
echo ""

# ── 1. Systeem updaten ────────────────────────────────────────────────────────
echo "[1/9] Systeem updaten..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
apt-get install -y -qq \
    python3 python3-pip python3-venv \
    postgresql postgresql-contrib \
    nginx git curl build-essential \
    ufw

# Node.js 20
echo "[2/9] Node.js installeren..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y -qq nodejs

# ── 2. Firewall ───────────────────────────────────────────────────────────────
echo "[3/9] Firewall instellen..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 8000/tcp
ufw --force enable

# ── 3. PostgreSQL ─────────────────────────────────────────────────────────────
echo "[4/9] Database aanmaken..."
systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "  (database bestaat al)"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
DATABASE_URL="postgresql+psycopg2://$DB_USER:$DB_PASS@localhost/$DB_NAME"

# ── 4. Repo clonen ────────────────────────────────────────────────────────────
echo "[5/9] Code ophalen van GitHub..."
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR && git pull
else
    git clone $REPO $APP_DIR
fi

# ── 5. Python environment ─────────────────────────────────────────────────────
echo "[6/9] Python dependencies installeren..."
python3 -m venv $APP_DIR/venv
$APP_DIR/venv/bin/pip install -q -r $APP_DIR/requirements.txt

# ── 6. Environment variabelen ─────────────────────────────────────────────────
echo "[7/9] Environment aanmaken..."
cat > $APP_DIR/.env << ENVEOF
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
BOOTSTRAP_TOKEN=Peanuts-Setup-2025!
ADMIN_EMAIL=admin@itspeanuts.ai
ADMIN_PASSWORD=AdminPeanuts2025!
FRONTEND_URL=http://$SERVER_IP
FROM_EMAIL="ItsPeanuts AI <onboarding@resend.dev>"

# Vul hieronder je API keys in (nano /opt/its-peanuts/.env):
OPENAI_API_KEY=
RESEND_API_KEY=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
ENVEOF
chmod 600 $APP_DIR/.env

# ── 7. Database migraties ─────────────────────────────────────────────────────
echo "[8/9] Database migraties uitvoeren..."
cd $APP_DIR
set -a; source .env; set +a
$APP_DIR/venv/bin/python -c "
from backend.db import engine
from backend.models import Base
Base.metadata.create_all(bind=engine)
print('  create_all OK')
"
$APP_DIR/venv/bin/alembic upgrade head

# ── 8. Frontend bouwen ────────────────────────────────────────────────────────
echo "[9/9] Frontend bouwen..."
cd $APP_DIR/frontend
npm install --silent
NEXT_PUBLIC_API_BASE="http://$SERVER_IP:8000" npm run build

# ── 9. Systemd services ───────────────────────────────────────────────────────
cat > /etc/systemd/system/peanuts-backend.service << SVCEOF
[Unit]
Description=ItsPeanuts AI Backend (FastAPI)
After=postgresql.service network.target

[Service]
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --ws websockets
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

cat > /etc/systemd/system/peanuts-frontend.service << SVCEOF
[Unit]
Description=ItsPeanuts AI Frontend (Next.js)
After=network.target

[Service]
User=root
WorkingDirectory=$APP_DIR/frontend
Environment=PORT=3000
Environment=NEXT_PUBLIC_API_BASE=http://$SERVER_IP:8000
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable --now peanuts-backend peanuts-frontend

# ── 10. Nginx ─────────────────────────────────────────────────────────────────
cat > /etc/nginx/sites-available/its-peanuts << 'NGINXEOF'
server {
    listen 80;
    server_name vorzaiq.com www.vorzaiq.com;
    client_max_body_size 20M;

    # WebSocket support
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /live-chat/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Backend API (via /api/ prefix)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/its-peanuts /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# ── 11. Update script aanmaken ────────────────────────────────────────────────
cat > /usr/local/bin/peanuts-deploy << 'DEPLOYEOF'
#!/bin/bash
# Gebruik: peanuts-deploy
# Haalt nieuwe code op van GitHub en herstart de services
set -e
APP_DIR="/opt/its-peanuts"
echo "==> Code ophalen..."
cd $APP_DIR && git pull
echo "==> Python packages bijwerken..."
$APP_DIR/venv/bin/pip install -q -r requirements.txt
echo "==> Migraties uitvoeren..."
set -a; source $APP_DIR/.env; set +a
$APP_DIR/venv/bin/python -c "from backend.db import engine; from backend.models import Base; Base.metadata.create_all(bind=engine)"
$APP_DIR/venv/bin/alembic upgrade head
echo "==> Backend herstarten..."
systemctl restart peanuts-backend
echo "==> Frontend bouwen..."
cd $APP_DIR/frontend
npm install --silent
SERVER_IP=$(curl -4 -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
NEXT_PUBLIC_API_BASE="http://$SERVER_IP:8000" npm run build
systemctl restart peanuts-frontend
echo ""
echo "✅ Deploy klaar!"
DEPLOYEOF
chmod +x /usr/local/bin/peanuts-deploy

# ── Klaar ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅  Setup voltooid!                     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Frontend:  http://$SERVER_IP"
echo "Backend:   http://$SERVER_IP:8000"
echo "API docs:  http://$SERVER_IP:8000/docs"
echo ""
echo "⚠️  Vul nog je API keys in:"
echo "   nano /opt/its-peanuts/.env"
echo "   systemctl restart peanuts-backend"
echo ""
echo "🔄 Toekomstige updates deployen:"
echo "   peanuts-deploy"
echo ""
echo "📋 Logs bekijken:"
echo "   journalctl -u peanuts-backend -f"
echo "   journalctl -u peanuts-frontend -f"
