#!/usr/bin/env bash
set -euo pipefail

# Create a release-ready tar.xz of the minimal MariaDB bundle for a given
# platform directory. This packs the contents of the prepared minimal
# directory into a single archive suitable for attaching to GitHub Releases.
#
# Usage: ./scripts/package-minimal-mariadb.sh <platform-folder> <output-file>
# Example: ./scripts/package-minimal-mariadb.sh src-tauri/bundled/mariadb/linux-x86_64 mariadb-linux-x86_64-minimal-10.6.24.tar.xz

SRC_DIR="$1"
OUT_FILE="$2"

if [ -z "$SRC_DIR" ] || [ -z "$OUT_FILE" ]; then
  echo "Usage: $0 <src-dir> <out-file>" >&2
  exit 2
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "Source dir not found: $SRC_DIR" >&2
  exit 2
fi

echo "Creating $OUT_FILE from $SRC_DIR"
tar -C "$SRC_DIR" -cJf "$OUT_FILE" .
sha256sum "$OUT_FILE" > "$OUT_FILE.sha256"

echo "Created $OUT_FILE and checksum $OUT_FILE.sha256"
