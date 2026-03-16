#!/usr/bin/env bash
# ================================================================
# Amarktai Network — VPS Deployment Script
# Target: /var/www/html on a Noble LEMP stack (PHP 8.3, Nginx, MySQL)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Before running:
#   1. Replace YOUR_QWEN_API_KEY_HERE in api/qwen-proxy.php
#   2. Ensure this script is run from the project root
# ================================================================

set -euo pipefail

WEB_ROOT="/var/www/html"
DB_NAME="amarktainet1"
DB_USER="amarktainet1"
DB_PASS="3mGbMgua4aER"
DB_ROOT_PASS=""          # leave blank to use sudo mysql without password

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Amarktai Network — VPS Deployment          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Copy files to web root ───────────────────────────────────────
echo "[1/6] Deploying files to $WEB_ROOT …"
sudo mkdir -p "$WEB_ROOT"/{api,admin,includes,database,assets}

sudo cp -r index.html about.html apps.html contact.html manifest.json sw.js "$WEB_ROOT/"
sudo cp -r api/*       "$WEB_ROOT/api/"
sudo cp -r admin/*     "$WEB_ROOT/admin/"
sudo cp -r includes/*  "$WEB_ROOT/includes/"
sudo cp -r database/*  "$WEB_ROOT/database/"

# Create the real config.php from the sample
if [ ! -f "$WEB_ROOT/includes/config.php" ]; then
  sudo cp "$WEB_ROOT/includes/config.sample.php" "$WEB_ROOT/includes/config.php"
  # Inject real DB password
  sudo sed -i "s/YOUR_DB_PASSWORD_HERE/$DB_PASS/g" "$WEB_ROOT/includes/config.php"
  echo "    config.php created with DB credentials"
fi

echo "    Files deployed ✓"

# ── 2. Set ownership & permissions ──────────────────────────────────
echo "[2/6] Setting permissions …"
sudo chown -R www-data:www-data "$WEB_ROOT"
sudo find "$WEB_ROOT" -type d -exec chmod 755 {} \;
sudo find "$WEB_ROOT" -type f -exec chmod 644 {} \;
# PHP files: no exec bit, readable by www-data only for sensitive dirs
sudo chmod 750 "$WEB_ROOT/admin"
sudo chmod 750 "$WEB_ROOT/includes"
echo "    Permissions set ✓"

# ── 3. Import database schema ────────────────────────────────────────
echo "[3/6] Importing database schema …"
if [ -n "$DB_ROOT_PASS" ]; then
  sudo mysql -u root -p"$DB_ROOT_PASS" "$DB_NAME" < database/schema.sql
else
  sudo mysql "$DB_NAME" < database/schema.sql
fi
echo "    Schema imported ✓"

# ── 4. Configure Nginx ───────────────────────────────────────────────
echo "[4/6] Writing Nginx config …"
sudo tee /etc/nginx/sites-available/amarktai > /dev/null <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.php;

    server_name _;

    # Security headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # PHP via php-fpm
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Protect sensitive includes dir
    location /includes/ { deny all; return 404; }

    # Block direct DB access
    location /database/ { deny all; return 404; }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Service worker at root scope
    location /sw.js {
        add_header Cache-Control "no-cache";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/amarktai /etc/nginx/sites-enabled/amarktai
# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

echo "    Nginx config written ✓"

# ── 5. Test & reload Nginx ───────────────────────────────────────────
echo "[5/6] Testing and reloading Nginx …"
sudo nginx -t && sudo systemctl reload nginx
echo "    Nginx reloaded ✓"

# ── 6. PHP-FPM status ────────────────────────────────────────────────
echo "[6/6] Checking PHP-FPM …"
sudo systemctl is-active php8.3-fpm || sudo systemctl start php8.3-fpm
echo "    PHP-FPM running ✓"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅  Deployment complete!                                ║"
echo "║                                                          ║"
echo "║  👉  Next steps:                                         ║"
echo "║  1. Set your Qwen API key:                               ║"
echo "║     sudo nano /var/www/html/api/qwen-proxy.php           ║"
echo "║     Replace YOUR_QWEN_API_KEY_HERE with your key         ║"
echo "║                                                          ║"
echo "║  2. Download hero video (optional):                      ║"
echo "║     Place as /var/www/html/assets/hero.mp4               ║"
echo "║                                                          ║"
echo "║  3. (Recommended) Set up SSL with Certbot:               ║"
echo "║     sudo certbot --nginx                                 ║"
echo "║                                                          ║"
echo "║  4. Secret admin access:                                 ║"
echo "║     Click the AI orb → type 'show admin' → Ashmor12@    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
