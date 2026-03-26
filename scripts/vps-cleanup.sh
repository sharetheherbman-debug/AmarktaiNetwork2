#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AmarktAI — VPS Nginx Cleanup Script
#
# Phases 2–3: removes stale Nginx configs, installs the canonical three-domain
#             configs from this repo, tests the config and reloads Nginx.
#
# SAFE GUARDS:
#   • Only disables configs for domains NOT in LIVE_SITES (never deletes files).
#   • Creates dated backups of every config it touches.
#   • Aborts if `nginx -t` fails — the live server is NEVER reloaded with a
#     broken config.
#   • Must be run as root (sudo).
#
# Usage:
#   sudo bash scripts/vps-cleanup.sh [--dry-run]
#
# --dry-run   Print what would happen without making any changes.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_NGINX="${REPO_DIR}/nginx/sites-available"
SITES_AVAILABLE="/etc/nginx/sites-available"
SITES_ENABLED="/etc/nginx/sites-enabled"
BACKUP_DIR="/etc/nginx/backup_$(date +%Y%m%d_%H%M%S)"

# The ONLY three domains that should be live on this VPS.
LIVE_SITES=("amarktai.com" "marketing.amarktai.com" "travel.amarktai.com")

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
BOLD='\033[1m'
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
CYN='\033[0;36m'
RST='\033[0m'

pass() { echo -e "  ${GRN}✔${RST}  $*"; }
warn() { echo -e "  ${YLW}⚠${RST}  $*"; }
fail() { echo -e "  ${RED}✖${RST}  $*"; }
info() { echo -e "  ${CYN}→${RST}  $*"; }
hdr()  { echo -e "\n${BOLD}$*${RST}"; }

run() {
    if $DRY_RUN; then
        echo -e "  ${YLW}[dry-run]${RST} $*"
    else
        eval "$@"
    fi
}

abort() { echo -e "\n${RED}ABORT: $*${RST}\n" >&2; exit 1; }

# ── Preflight ─────────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]] && ! $DRY_RUN; then
    abort "This script must be run as root.  Use: sudo bash scripts/vps-cleanup.sh"
fi

if [[ ! -d "$SITES_ENABLED" ]]; then
    abort "Nginx does not appear to be installed (${SITES_ENABLED} not found)."
fi

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════════════${RST}"
echo -e "${BOLD} AmarktAI — VPS Nginx Cleanup${RST}$(if $DRY_RUN; then echo -e " ${YLW}[DRY RUN]${RST}"; fi)"
echo -e "${BOLD}══════════════════════════════════════════════════════════════════${RST}"

# ── PHASE 2A · Backup existing config ─────────────────────────────────────────
hdr "── PHASE 2 · Backup current Nginx state → ${BACKUP_DIR} ──"
run "mkdir -p '${BACKUP_DIR}'"
run "cp -r '${SITES_ENABLED}' '${BACKUP_DIR}/sites-enabled'"
run "cp -r '${SITES_AVAILABLE}' '${BACKUP_DIR}/sites-available'"
pass "Backup created (or would be created in dry-run)"

# ── PHASE 2B · Disable stale sites ────────────────────────────────────────────
hdr "── PHASE 2 · Disable stale configs in ${SITES_ENABLED} ──"

enabled_files=()
while IFS= read -r -d '' f; do
    enabled_files+=("$(basename "$f")")
done < <(find "$SITES_ENABLED" -maxdepth 1 \( -type f -o -type l \) -print0 2>/dev/null | sort -z)

disabled_count=0
for f in "${enabled_files[@]}"; do
    is_live=false
    for live in "${LIVE_SITES[@]}"; do
        if [[ "$f" == "$live" || "$f" == "${live}.conf" ]]; then
            is_live=true
            break
        fi
    done

    if $is_live; then
        pass "KEEP   : ${SITES_ENABLED}/${f}"
    else
        warn "STALE  : ${SITES_ENABLED}/${f}  → removing symlink"
        run "rm -f '${SITES_ENABLED}/${f}'"
        (( disabled_count++ )) || true
    fi
done

if [[ $disabled_count -eq 0 ]]; then
    pass "No stale configs found — nothing to disable."
fi

# ── PHASE 3A · Install canonical configs from repo ────────────────────────────
hdr "── PHASE 3 · Install canonical Nginx configs from repo ──"

for domain in "${LIVE_SITES[@]}"; do
    src="${REPO_NGINX}/${domain}"
    dst_avail="${SITES_AVAILABLE}/${domain}"
    dst_enabled="${SITES_ENABLED}/${domain}"

    if [[ ! -f "$src" ]]; then
        warn "Repo config not found: ${src}  — skipping ${domain}"
        continue
    fi

    info "Copying ${src} → ${dst_avail}"
    run "cp -f '${src}' '${dst_avail}'"

    if [[ ! -L "$dst_enabled" ]]; then
        info "Symlinking ${dst_avail} → ${dst_enabled}"
        run "ln -sf '${dst_avail}' '${dst_enabled}'"
        pass "Enabled : ${domain}"
    else
        pass "Already enabled: ${domain}"
    fi
done

# ── PHASE 3B · Remove default Nginx placeholder if present ────────────────────
hdr "── PHASE 3 · Remove default Nginx placeholder ──"
default_link="${SITES_ENABLED}/default"
if [[ -e "$default_link" || -L "$default_link" ]]; then
    warn "Removing default Nginx placeholder: ${default_link}"
    run "rm -f '${default_link}'"
    pass "Default placeholder removed."
else
    pass "No default placeholder found — nothing to remove."
fi

# ── PHASE 3C · Verify nginx -t ────────────────────────────────────────────────
hdr "── PHASE 3 · nginx -t ──"

if $DRY_RUN; then
    warn "[dry-run] Skipping nginx -t (no changes made)"
else
    if nginx -t 2>&1; then
        pass "nginx -t passed"
    else
        fail "nginx -t FAILED — rolling back enabled symlinks and aborting"
        # Restore backup
        echo "  Restoring from backup: ${BACKUP_DIR}/sites-enabled"
        cp -r "${BACKUP_DIR}/sites-enabled/." "${SITES_ENABLED}/"
        abort "nginx config test failed.  Backup restored from ${BACKUP_DIR}.  Fix errors and retry."
    fi
fi

# ── PHASE 3D · Reload Nginx ────────────────────────────────────────────────────
hdr "── PHASE 3 · Reload Nginx ──"
run "systemctl reload nginx"
pass "Nginx reloaded."

# ── PHASE 4 · Post-reload reachability check ──────────────────────────────────
hdr "── PHASE 4 · Local proxy reachability check ──"
if ! $DRY_RUN && command -v curl &>/dev/null; then
    sleep 1
    http_code=$(curl -s --max-time 5 http://127.0.0.1:3000 -o /dev/null -w "%{http_code}" || echo "000")
    if echo "$http_code" | grep -qE "^[23]"; then
        pass "127.0.0.1:3000 responded with HTTP ${http_code}"
    else
        fail "127.0.0.1:3000 returned HTTP ${http_code} — check that the Next.js app is running:"
        echo "      pm2 list"
        echo "      pm2 start npm --name amarktai-network -- start"
    fi
else
    warn "Skipping reachability check (dry-run or curl unavailable)"
fi

# ── Final summary ─────────────────────────────────────────────────────────────
hdr "── FINAL STATE ──"
echo "  Live domains now enabled:"
for domain in "${LIVE_SITES[@]}"; do
    if [[ -L "${SITES_ENABLED}/${domain}" ]] || $DRY_RUN; then
        pass "${domain}"
    else
        warn "${domain}  ← symlink not found — check manually"
    fi
done

echo ""
echo -e "${BOLD}Verification commands:${RST}"
echo "  sudo nginx -t"
echo "  ls -la /etc/nginx/sites-enabled/"
echo "  curl -I https://amarktai.com"
echo "  curl -I https://marketing.amarktai.com"
echo "  curl -I https://travel.amarktai.com"
echo "  pm2 list"
echo ""

if $DRY_RUN; then
    echo -e "${YLW}DRY RUN complete — no changes were made.${RST}"
    echo "  Re-run without --dry-run to apply changes:"
    echo "  sudo bash scripts/vps-cleanup.sh"
else
    pass "Cleanup complete."
fi
echo ""
