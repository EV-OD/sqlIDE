#!/usr/bin/env bash
set -euo pipefail

# Test installing the bundled MariaDB into the current user's app data dir,
# initialize the data directory and attempt to start the server. This is
# intended for local verification / CI smoke tests (not for production).
#
# Usage: ./scripts/test-bundle-install.sh [--keep] [--bundle-dir path]
#   --keep        : do not remove the temporary install after test
#   --bundle-dir  : path to prepared minimal mariadb bundle (defaults to
#                   src-tauri/bundled/mariadb/linux-x86_64)

KEEP=0
BUNDLE_DIR="${1:-src-tauri/bundled/mariadb/linux-x86_64}"
while [ $# -gt 0 ]; do
  case "$1" in
    --keep) KEEP=1; shift ;;
    --bundle-dir) BUNDLE_DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "Bundle dir not found: $BUNDLE_DIR" >&2
  exit 2
fi

DEST="$HOME/.local/share/sql-ide/mariadb"
echo "Testing bundle install -> $DEST"

rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"
cp -a "$BUNDLE_DIR" "$DEST"

chmod -R a+rx "$DEST/bin" || true

# Ensure my.cnf exists
if [ -f "$DEST/my.cnf.dist.template" ] && [ ! -f "$DEST/my.cnf" ]; then
  cp "$DEST/my.cnf.dist.template" "$DEST/my.cnf"
fi

LOG_INIT="/tmp/sql-ide-mariadb-init.log"
LOG_SERVER="/tmp/sql-ide-mariadb-server.log"

echo "Running mariadb-install-db (logs -> $LOG_INIT)"
"$DEST/bin/mariadb-install-db" --no-defaults --basedir="$DEST" --datadir="$DEST/data" \
  --user="$(whoami)" --auth-root-authentication-method=normal --skip-test-db --force \
  >"$LOG_INIT" 2>&1 || true

echo "Init log (tail):"
tail -n 80 "$LOG_INIT" || true

echo "Attempting to start mariadbd (logs -> $LOG_SERVER)"
"$DEST/bin/mariadbd" --defaults-file="$DEST/my.cnf" --basedir="$DEST" --port=3307 >"$LOG_SERVER" 2>&1 &
sleep 2

if pgrep -f "$DEST/bin/mariadbd" >/dev/null; then
  echo "mariadbd started successfully"
  echo "Server log (tail):"
  tail -n 80 "$LOG_SERVER" || true
else
  echo "mariadbd did not start. See logs:" >&2
  echo "  $LOG_INIT" >&2
  echo "  $LOG_SERVER" >&2
  exit 1
fi

if [ "$KEEP" -eq 0 ]; then
  echo "Stopping server and cleaning up"
  pkill -f "$DEST/bin/mariadbd" || true
  sleep 1
  rm -rf "$DEST"
else
  echo "Leaving install in place: $DEST"
fi

echo "Test complete"
