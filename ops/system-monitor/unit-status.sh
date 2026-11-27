#!/bin/sh
set -eu
umask 022
out=$(mktemp /run/rubyhair-monitor-units.XXXXXX)
trap 'rm -f "$out"' EXIT HUP INT TERM
for unit in rubyhair-db-tls.service rubyhair-stock-reservations.timer rubyhair-db-backup.timer; do
 state=$(/usr/bin/systemctl show "$unit" --property=ActiveState --value 2>/dev/null) || state=unknown
 case "$state" in active|inactive|failed|activating|deactivating|reloading) ;; *) state=unknown ;; esac
 printf '%s %s\n' "$unit" "$state" >> "$out"
done
chmod 644 "$out"
mv -f "$out" /run/rubyhair-monitor-units.status
