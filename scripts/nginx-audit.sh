#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AmarktAI — VPS Nginx Audit Script (READ-ONLY)
#
# Phase 1: audits the current Nginx state and reports what is active,
#           what is stale, and whether amarktai.com is correctly proxied.
#
# Usage:  bash scripts/nginx-audit.sh
# Requires: nginx, curl (optional)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SITES_ENABLED="/etc/nginx/sites-enabled"
SITES_AVAILABLE="/etc/nginx/sites-available"

# The only three domains that should be live on this VPS.
LIVE_SITES=("amarktai.com" "marketing.amarktai.com" "travel.amarktai.com")

BOLD='\033[1m'
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
RST='\033[0m'

pass() { echo -e "  ${GRN}✔${RST}  $*"; }
warn() { echo -e "  ${YLW}⚠${RST}  $*"; }
fail() { echo -e "  ${RED}✖${RST}  $*"; }
hdr()  { echo -e "\n${BOLD}$*${RST}"; }

# ── 1. List every file in sites-enabled ──────────────────────────────────────
hdr "── PHASE 1 · Active sites in ${SITES_ENABLED} ──"
if [[ ! -d "$SITES_ENABLED" ]]; then
    fail "Directory ${SITES_ENABLED} not found — is Nginx installed?"
    exit 1
fi

enabled_files=()
while IFS= read -r -d '' f; do
    enabled_files+=("$(basename "$f")")
done < <(find "$SITES_ENABLED" -maxdepth 1 \( -type f -o -type l \) -print0 2>/dev/null | sort -z)

if [[ ${#enabled_files[@]} -eq 0 ]]; then
    warn "No files found in ${SITES_ENABLED}"
else
    for f in "${enabled_files[@]}"; do
        echo "    • $f"
    done
fi

# ── 2. Classify each enabled site ─────────────────────────────────────────────
hdr "── PHASE 1 · Classification (LIVE vs STALE) ──"

stale_sites=()
for f in "${enabled_files[@]}"; do
    is_live=false
    for live in "${LIVE_SITES[@]}"; do
        if [[ "$f" == "$live" ]]; then
            is_live=true
            break
        fi
    done
    if $is_live; then
        pass "LIVE   : $f"
    else
        fail "STALE  : $f  ← should be disabled"
        stale_sites+=("$f")
    fi
done

if [[ ${#stale_sites[@]} -eq 0 ]]; then
    pass "No stale configs found."
fi

# ── 3. Check amarktai.com proxy target ────────────────────────────────────────
hdr "── PHASE 1 · amarktai.com proxy check ──"

main_conf="${SITES_ENABLED}/amarktai.com"
if [[ ! -e "$main_conf" ]]; then
    # Try without .conf extension
    main_conf="${SITES_ENABLED}/amarktai.com.conf"
fi

if [[ -e "$main_conf" ]]; then
    if grep -qE "proxy_pass\s+http://127\.0\.0\.1:3000" "$main_conf"; then
        pass "amarktai.com proxies to 127.0.0.1:3000"
    else
        fail "amarktai.com does NOT proxy to 127.0.0.1:3000"
        echo "    Actual proxy_pass lines:"
        grep -E "proxy_pass" "$main_conf" | sed 's/^/        /' || echo "        (none found)"
    fi

    if grep -qE "^\s*root\s+" "$main_conf"; then
        fail "amarktai.com still has a 'root' directive — old static HTML may be served:"
        grep -E "^\s*root\s+" "$main_conf" | sed 's/^/        /'
    else
        pass "No 'root' static-file directive in amarktai.com config"
    fi
else
    fail "amarktai.com config not found in ${SITES_ENABLED}"
fi

# ── 4. Check SSL certificate paths ────────────────────────────────────────────
hdr "── PHASE 1 · SSL certificate paths ──"
for domain in "${LIVE_SITES[@]}"; do
    cert_dir="/etc/letsencrypt/live/${domain}"
    if [[ -d "$cert_dir" ]]; then
        pass "Cert exists : ${cert_dir}"
    else
        warn "Cert missing: ${cert_dir}  (run: certbot --nginx -d ${domain})"
    fi
done

# ── 5. Nginx config test ───────────────────────────────────────────────────────
hdr "── PHASE 1 · nginx -t ──"
if nginx -t 2>&1; then
    pass "nginx -t passed"
else
    fail "nginx -t FAILED — resolve errors above before reloading"
fi

# ── 6. Connectivity spot-check (optional, needs curl) ─────────────────────────
hdr "── PHASE 1 · Local proxy reachability ──"
if command -v curl &>/dev/null; then
    if curl -s --max-time 3 http://127.0.0.1:3000 -o /dev/null -w "%{http_code}" | grep -qE "^[23]"; then
        pass "127.0.0.1:3000 is responding"
    else
        fail "127.0.0.1:3000 is NOT responding — is the Next.js app (PM2) running?"
    fi
else
    warn "curl not found — skipping local reachability check"
fi

# ── Summary ────────────────────────────────────────────────────────────────────
hdr "── SUMMARY ──"
if [[ ${#stale_sites[@]} -gt 0 ]]; then
    echo -e "  ${RED}Stale configs that must be disabled:${RST}"
    for s in "${stale_sites[@]}"; do
        echo "    - $s"
    done
    echo ""
    echo "  Run  bash scripts/vps-cleanup.sh  to fix automatically."
else
    pass "All enabled sites match live domains. No cleanup needed."
fi
echo ""
