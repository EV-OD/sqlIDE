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

# Preserve any resolveip helper if present, otherwise generate a small portable
# resolveip script so pruned bundles will always include it (mariadb-install-db
# expects it during initialization).
if [ -f "bin/resolveip" ]; then
  mv "bin/resolveip" "$TMP_KEEP/bin/"
elif [ -f "extra/resolveip" ]; then
  mv "extra/resolveip" "$TMP_KEEP/bin/" || true
else
  # create a tiny resolveip helper that tries common resolvers
  cat > "$TMP_KEEP/bin/resolveip" <<'EOF'
#!/usr/bin/env sh
host="$1"
if [ -z "$host" ]; then
  echo "Usage: resolveip hostname" >&2
  exit 2
fi

# Preserve my_print_defaults which is needed by mariadb-install-db to read defaults
if [ -f "extra/my_print_defaults" ]; then
  mkdir -p "$TMP_KEEP/extra"
  mv "extra/my_print_defaults" "$TMP_KEEP/extra/" || true
fi
if [ -f "bin/my_print_defaults" ]; then
  mv "bin/my_print_defaults" "$TMP_KEEP/bin/" || true
fi
if command -v getent >/dev/null 2>&1; then
  getent hosts "$host" | awk '{print $1, $2; exit 0}' && exit 0
fi
if command -v python3 >/dev/null 2>&1; then
  python3 - <<PY 2>/dev/null
import sys,socket
try:
    a = socket.gethostbyname_ex(sys.argv[1])
    name = a[0] if a[0] else sys.argv[1]
    ip = a[2][0] if a[2] else ''
    print(ip, name)
    sys.exit(0)
except Exception:
    sys.exit(1)
PY
  if [ $? -eq 0 ]; then exit 0; fi
fi
if command -v nslookup >/dev/null 2>&1; then
  ip=$(nslookup "$host" 2>/dev/null | awk '/^Address: /{print $2; exit}')
  if [ -n "$ip" ]; then
    echo "$ip $host"
    exit 0
  fi
fi
echo "Could not resolve $host" >&2
exit 1
EOF
  chmod +x "$TMP_KEEP/bin/resolveip" || true
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
