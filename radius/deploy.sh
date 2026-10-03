#!/usr/bin/env bash
# Installs (if needed) and configures FreeRADIUS on the server, then tests it.
# Safe to re-run any time. Run from the repo root:  ./radius/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "Missing radius/.env. Copy radius/env.example to radius/.env and fill it in."; exit 1; }
# shellcheck disable=SC1091
source .env
KEY="${RADIUS_SSH_KEY/#\~/$HOME}"
SECRET_FILE="${RADIUS_SECRET_FILE/#\~/$HOME}"
[ -f "$SECRET_FILE" ] || { echo "Missing secret file: $SECRET_FILE"; exit 1; }
SECRET="$(tr -d '\n' < "$SECRET_FILE")"
[ ${#SECRET} -ge 16 ] || { echo "Shared secret must be at least 16 characters."; exit 1; }

SSH=(ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=15 "root@$RADIUS_HOST")
CLIENTS="$(sed "s|__SECRET__|$SECRET|" clients.conf.template)"

echo "Deploying RADIUS config to $RADIUS_HOST ..."
"${SSH[@]}" "CLIENTS_B64='$(printf '%s' "$CLIENTS" | base64 | tr -d '\n')' AUTHORIZE_B64='$(base64 < authorize | tr -d '\n')' bash -s" <<'REMOTE'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
C=/etc/freeradius/3.0

if ! command -v freeradius >/dev/null 2>&1; then
  echo "Installing FreeRADIUS and firewall ..."
  apt-get update -qq >/dev/null
  apt-get install -y -qq freeradius freeradius-utils ufw >/dev/null
fi

echo "$CLIENTS_B64"   | base64 -d > $C/clients.conf
echo "$AUTHORIZE_B64" | base64 -d > $C/mods-config/files/authorize
chown freerad:freerad $C/clients.conf $C/mods-config/files/authorize
chmod 640 $C/clients.conf $C/mods-config/files/authorize

# Log every accepted and rejected login (never the password).
sed -i 's/^\(\s*\)auth = no/\1auth = yes/' $C/radiusd.conf

# Firewall: SSH plus the two RADIUS ports, nothing else.
ufw allow 22/tcp >/dev/null; ufw allow 1812/udp >/dev/null; ufw allow 1813/udp >/dev/null
ufw default deny incoming >/dev/null; ufw --force enable >/dev/null

freeradius -XC >/dev/null 2>&1 || { echo "CONFIG ERROR:"; freeradius -XC 2>&1 | tail -15; exit 1; }
systemctl enable freeradius >/dev/null 2>&1
systemctl restart freeradius
sleep 2
echo "service: $(systemctl is-active freeradius)"
echo "self-test:"
radtest guest guest 127.0.0.1 0 testing123 2>&1 | grep -E 'Received|Session-Timeout|Idle-Timeout' | sed 's/^/  /'
REMOTE
echo "Done."
