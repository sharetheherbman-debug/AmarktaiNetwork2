# ─────────────────────────────────────────────────────────────────────────────
# Amarktai Network — Marketing Subdomain
# marketing.amarktai.com  →  marketing app on 127.0.0.1:3001
#
# Verify the port below matches what PM2 is actually running before
# enabling this config.  Check with: pm2 list
#
# Deploy: sudo ln -sf /etc/nginx/sites-available/marketing.amarktai.com \
#                     /etc/nginx/sites-enabled/marketing.amarktai.com
#         sudo nginx -t && sudo systemctl reload nginx
# ─────────────────────────────────────────────────────────────────────────────

# ── HTTP → HTTPS redirect ────────────────────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name marketing.amarktai.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://marketing.amarktai.com$request_uri;
    }
}

# ── HTTPS — proxy to marketing app ───────────────────────────────────────────
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name marketing.amarktai.com;

    # ── SSL — Let's Encrypt (Certbot managed) ────────────────────────────────
    ssl_certificate     /etc/letsencrypt/live/marketing.amarktai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/marketing.amarktai.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # ── Security headers ─────────────────────────────────────────────────────
    add_header X-Frame-Options        "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff"    always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;

    # ── Proxy to marketing app ───────────────────────────────────────────────
    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
