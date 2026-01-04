#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./scripts/make-minimal-mariadb.sh [SRC_DIR] [TARGET_DIR]
# Environment options:
#  STRIP=1   -> run `strip --strip-unneeded` on the mariadbd binary if `strip` exists
#  UPX=1     -> run `upx --best` on the mariadbd binary if `upx` exists
#  PORT      -> port to configure (default 3307)

SRC_DIR=${1:-maria-db-files/mariadb-10.6.24-linux-systemd-x86_64}
TARGET_DIR=${2:-src-tauri/bundled/mariadb/linux-x86_64}
PORT=${PORT:-3307}
STRIP=${STRIP:-0}
UPX=${UPX:-0}

echo "Preparing minimal MariaDB bundle"
echo "  src: $SRC_DIR"
echo "  target: $TARGET_DIR"

if [ ! -d "$SRC_DIR" ]; then
  echo "Source directory not found: $SRC_DIR"
  exit 1
fi

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

mkdir -p "$TARGET_DIR/bin"
mkdir -p "$TARGET_DIR/lib"
mkdir -p "$TARGET_DIR/share/english"
mkdir -p "$TARGET_DIR/data"
mkdir -p "$TARGET_DIR/support-files"

echo "Copying minimal binaries..."
if [ -f "$SRC_DIR/bin/mariadbd" ]; then
  cp "$SRC_DIR/bin/mariadbd" "$TARGET_DIR/bin/"
else
  echo "mariadbd not found in source bin/ - aborting"
  exit 1
fi

if [ -f "$SRC_DIR/bin/mariadb" ]; then
  cp "$SRC_DIR/bin/mariadb" "$TARGET_DIR/bin/"
fi

# Copy essential error messages
if [ -f "$SRC_DIR/share/mysql/english/errmsg.sys" ]; then
  cp "$SRC_DIR/share/mysql/english/errmsg.sys" "$TARGET_DIR/share/english/errmsg.sys"
elif [ -f "$SRC_DIR/share/english/errmsg.sys" ]; then
  cp "$SRC_DIR/share/english/errmsg.sys" "$TARGET_DIR/share/english/errmsg.sys"
else
  echo "Warning: errmsg.sys not found in source; server may not run correctly"
fi

echo "Copying minimal libraries..."
# Copy main libmariadb and any libmariadb.so.* files
if [ -d "$SRC_DIR/lib" ]; then
  shopt -s nullglob
  for f in "$SRC_DIR/lib"/libmariadb.so*; do
    cp "$f" "$TARGET_DIR/lib/" || true
  done
  # copy ha_aria plugin if present
  if [ -f "$SRC_DIR/lib/plugin/ha_aria.so" ]; then
    mkdir -p "$TARGET_DIR/lib/plugin"
    cp "$SRC_DIR/lib/plugin/ha_aria.so" "$TARGET_DIR/lib/plugin/"
  fi
  # copy pkgconfig files if present (small)
  if [ -d "$SRC_DIR/lib/pkgconfig" ]; then
    mkdir -p "$TARGET_DIR/lib/pkgconfig"
    cp -r "$SRC_DIR/lib/pkgconfig/"* "$TARGET_DIR/lib/pkgconfig/"
  fi
  shopt -u nullglob
else
  echo "Warning: source lib/ not found"
fi

echo "Cleaning up plugins (remove other engine plugins to save space)"
# remove everything else inside lib/plugin except ha_aria.so
if [ -d "$TARGET_DIR/lib/plugin" ]; then
  for p in "$TARGET_DIR/lib/plugin"/*; do
    basename=$(basename "$p")
    if [ "$basename" != "ha_aria.so" ]; then
      rm -f "$p" || true
    fi
  done
fi

echo "Setting permissions"
chmod -R a+r "$TARGET_DIR"
chmod +x "$TARGET_DIR/bin/mariadbd" || true
chmod +x "$TARGET_DIR/bin/mariadb" || true

echo "Optionally stripping binary (STRIP=$STRIP) and UPX (UPX=$UPX)"
if [ "$STRIP" = "1" ] && command -v strip >/dev/null 2>&1; then
  echo "Stripping mariadbd..."
  strip --strip-unneeded "$TARGET_DIR/bin/mariadbd" || true
fi

if [ "$UPX" = "1" ] && command -v upx >/dev/null 2>&1; then
  echo "Compressing mariadbd with UPX (best)..."
  upx --best "$TARGET_DIR/bin/mariadbd" || true
fi

echo "Writing minimal my.cnf (disables InnoDB, uses Aria, app-local paths)"
MYCNF="$TARGET_DIR/my.cnf"
cat > "$MYCNF" <<EOF
[mysqld]
datadir=$(pwd)/$TARGET_DIR/data
port=$PORT
bind-address=127.0.0.1
socket=$(pwd)/$TARGET_DIR/mariadb.sock
pid-file=$(pwd)/$TARGET_DIR/mariadb.pid
log-error=$(pwd)/$TARGET_DIR/mariadb.log
skip-innodb
default-storage-engine=Aria
skip-networking=0
skip-name-resolve
explicit_defaults_for_timestamp
innodb_buffer_pool_size=1M
innodb_log_file_size=1M
EOF

echo "Ensure data dir exists and is writable"
mkdir -p "$TARGET_DIR/data"
chmod -R 700 "$TARGET_DIR/data"

echo "Minimal MariaDB bundle prepared at: $TARGET_DIR"
du -sh "$TARGET_DIR" || true

echo "Done. To run the server from the IDE folder, use something like:"
echo "  ./bin/mariadbd --defaults-file=./my.cnf --datadir=./data"
