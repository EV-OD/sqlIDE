#!/usr/bin/env bash
set -euo pipefail

# Prune an extracted MariaDB folder to keep only the minimal files needed
# Usage: ./scripts/prune-to-minimal.sh /path/to/mariadb-extracted [-y]
#
# Keeps:
#  bin/mariadbd
#  bin/mariadb (if present)
#  bin/mariadb-install-db (needed for initialization) or scripts/mariadb-install-db
#  share/english/errmsg.sys
#  share/*.sql (system table definitions)
#  share/charsets/ (character set definitions)
#  lib/ (entire lib), but inside lib/plugin only keep ha_aria.so

SRC_DIR=${1:-maria-db-files/mariadb-10.6.24-linux-systemd-x86_64}
FORCE=${2:-}

if [ ! -d "$SRC_DIR" ]; then
  echo "Source directory not found: $SRC_DIR"
  exit 1
fi

echo "This will remove most files inside: $SRC_DIR"
if [ "$FORCE" != "-y" ]; then
  read -p "Continue and prune to minimal (y/N)? " ans
  case "$ans" in
    [Yy]*) ;;
    *) echo "Aborted."; exit 1;;
  esac
fi

pushd "$SRC_DIR" >/dev/null

# Work in a temp location to avoid accidental data loss
TMP_KEEP="$(mktemp -d)"

echo "Keeping minimal files in temporary area: $TMP_KEEP"

# Ensure parents exist and move files if present
mkdir -p "$TMP_KEEP/bin"
if [ -f "bin/mariadbd" ]; then
  mv "bin/mariadbd" "$TMP_KEEP/bin/"
fi
if [ -f "bin/mariadb" ]; then
  mv "bin/mariadb" "$TMP_KEEP/bin/"
fi
if [ -f "bin/mariadb-install-db" ]; then
  mv "bin/mariadb-install-db" "$TMP_KEEP/bin/"
fi
if [ -f "scripts/mariadb-install-db" ]; then
  mv "scripts/mariadb-install-db" "$TMP_KEEP/bin/"
fi

mkdir -p "$TMP_KEEP/share/english"
if [ -f "share/mysql/english/errmsg.sys" ]; then
  mv "share/mysql/english/errmsg.sys" "$TMP_KEEP/share/english/" || true
fi
if [ -f "share/english/errmsg.sys" ]; then
  mv "share/english/errmsg.sys" "$TMP_KEEP/share/english/" || true
fi

# Keep SQL files from share/ directory (needed for initialization)
if [ -d "share" ]; then
  # Keep all .sql files directly in share/
  find share -maxdepth 1 -name "*.sql" -exec mv {} "$TMP_KEEP/share/" \; 2>/dev/null || true
  
  # Keep charsets directory if it exists
  if [ -d "share/charsets" ]; then
    mv "share/charsets" "$TMP_KEEP/share/" || true
  fi
fi

# Move lib entirely if present
if [ -d "lib" ]; then
  mkdir -p "$TMP_KEEP/lib"
  # move lib files
  mv lib/* "$TMP_KEEP/lib/" 2>/dev/null || true
  # inside plugin: keep only ha_aria.so
  if [ -d "$TMP_KEEP/lib/plugin" ]; then
    find "$TMP_KEEP/lib/plugin" -maxdepth 1 -type f ! -name 'ha_aria.so' -exec rm -f {} + || true
  fi
fi

echo "Removing all other files in $SRC_DIR..."
# remove everything now in the source dir
shopt -s dotglob
for entry in *; do
  rm -rf "$entry" || true
done
shopt -u dotglob

echo "Restoring kept files..."
mkdir -p bin share lib support-files
cp -a "$TMP_KEEP/"* ./

echo "Cleaning temporary area"
rm -rf "$TMP_KEEP"

echo "Prune complete. Remaining tree:"
ls -la

popd >/dev/null

echo "Done. Remember to run your minimalization scripts (strip/UPX) if desired."
