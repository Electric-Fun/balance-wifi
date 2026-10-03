#!/usr/bin/env bash
# Shows recent guest activity from the RADIUS server. Run from the repo root:  ./radius/logs.sh
# Times are UTC. Devices are shown by the last 4 characters of their Wi-Fi address only.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "Missing radius/.env. Copy radius/env.example to radius/.env and fill it in."; exit 1; }
# shellcheck disable=SC1091
source .env
KEY="${RADIUS_SSH_KEY/#\~/$HOME}"
ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=15 "root@$RADIUS_HOST" 'bash -s' <<'REMOTE'
echo "== Server =="
echo "service: $(systemctl is-active freeradius)   time now: $(date -u '+%a %b %e %H:%M UTC')"
echo
echo "== Last 20 login decisions (OK = guest let in) =="
grep -E 'Auth:' /var/log/freeradius/radius.log | grep -v 'client localhost' | tail -20 \
  | sed -E 's/ : Auth: \([0-9]+\) /  /; s/ \(from client .*//; s/\(pap:[^)]*\)//'
echo
echo "== Last 20 session events (Start = connected, Stop = session ended) =="
find /var/log/freeradius/radacct -type f -name 'detail-*' | sort | tail -3 | xargs -r cat | awk '
  /^[A-Z][a-z][a-z] [A-Z]/ { ts=$0 }
  /Acct-Status-Type/      { type=$3 }
  /Calling-Station-Id/    { gsub(/"/,"",$3); dev=substr($3,length($3)-3) }
  /Aruba-Essid-Name/      { gsub(/"/,"",$3); net=$3 }
  /Acct-Session-Time/     { secs=$3 }
  /Acct-Terminate-Cause/  { cause=$3 }
  /^$/ { if (type!="") { extra=""; if (type=="Stop") extra=sprintf("  lasted %d min  (%s)", secs/60, cause);
         printf "%s  %-15s device ..%s  %s%s\n", ts, type, dev, net, extra }
         type="";secs=0;cause="" }' | tail -20
REMOTE
