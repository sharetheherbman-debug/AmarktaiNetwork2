# ─────────────────────────────────────────────────────────────────────────────
# Amarktai Network — Main Domain
# amarktai.com  →  Next.js app on 127.0.0.1:3000
#
# Deploy: sudo ln -sf /etc/nginx/sites-available/amarktai.com \
#                     /etc/nginx/sites-enabled/amarktai.com
#         sudo nginx -t && sudo systemctl reload nginx
# ─────────────────────────────────────────────────────────────────────────────

# ── HTTP → HTTPS redirect ────────────────────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name amarktai.com www.amarktai.com;

    # Allow Let's Encrypt ACME challenges through before redirecting.
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://amarktai.com$request_uri;
    }
}

# ── HTTPS — proxy to Next.js app ─────────────────────────────────────────────
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name amarktai.com www.amarktai.com;

    # ── SSL — Let's Encrypt (Certbot managed) ────────────────────────────────
    ssl_certificate     /etc/letsencrypt/live/amarktai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/amarktai.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # ── Security headers ─────────────────────────────────────────────────────
    add_header X-Frame-Options       "SAMEORIGIN"  always;
    add_header X-Content-Type-Options "nosniff"    always;
    add_header Referrer-Policy       "strict-origin-when-cross-origin" always;

    # ── Proxy to Next.js ─────────────────────────────────────────────────────
    location / {
        proxy_pass         http://127.0.0.1:3000;
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
