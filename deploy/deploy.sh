#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
release_id="$(date -u +%Y%m%dT%H%M%S)-$(sha256sum dist/index.html | cut -c1-8)"
release_dir="/var/www/position-manager/releases/$release_id"
if [[ -e "$release_dir" ]]; then echo "Release already exists: $release_dir" >&2; exit 1; fi
install -d "$release_dir" /opt/position-manager
cp -a dist/. "$release_dir/"
# Retain older hashed assets for clients still running the previous service worker.
if [[ -d /var/www/position-manager/current/assets ]]; then
  cp -an /var/www/position-manager/current/assets/. "$release_dir/assets/"
fi
chmod -R a+rX "$release_dir"
install -m 644 deploy/server.mjs /opt/position-manager/server.mjs
ln -s "$release_dir" /var/www/position-manager/current.next
mv -Tf /var/www/position-manager/current.next /var/www/position-manager/current
install -m 644 deploy/position-manager.service /etc/systemd/system/position-manager.service
systemctl daemon-reload
systemctl enable --now position-manager
systemctl restart position-manager
curl --fail --silent --retry 10 --retry-connrefused --retry-delay 1 --output /dev/null http://127.0.0.1:4178/
printf 'Published: %s\n' "$release_dir"
