#!/usr/bin/env bash
set -euo pipefail

# Create a highly compressed archive from the minimal MariaDB bundle
# Usage:
#   ./scripts/create-minimal-archive.sh [INPUT_DIR] [OUTPUT_DIR]
# Environment options:
#   STRIP=1 -> run `strip --strip-unneeded` on binaries if available
#   UPX=1   -> run `upx --best` on binaries if available
#   ZIP=1   -> also create a zip file in addition to tar.xz

INPUT_DIR=${1:-src-tauri/bundled/mariadb/linux-x86_64}
OUTPUT_DIR=${2:-bundled}
NAME=${NAME:-mariadb-minimal}

echo "Input: $INPUT_DIR"
echo "Output dir: $OUTPUT_DIR"

if [ ! -d "$INPUT_DIR" ]; then
  echo "Input directory does not exist: $INPUT_DIR"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
# make OUTPUT_DIR absolute so tar writes to correct location even after pushd
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"

pushd "$INPUT_DIR" >/dev/null

if [ "${STRIP:-0}" = "1" ] && command -v strip >/dev/null 2>&1; then
  echo "Stripping binaries..."
  [ -f bin/mariadbd ] && strip --strip-unneeded bin/mariadbd || true
  [ -f bin/mariadb ] && strip --strip-unneeded bin/mariadb || true
fi

if [ "${UPX:-0}" = "1" ] && command -v upx >/dev/null 2>&1; then
  echo "Compressing with UPX..."
  [ -f bin/mariadbd ] && upx --best bin/mariadbd || true
fi

# create reproducible tar.xz
OUT_TARXZ="$OUTPUT_DIR/${NAME}.tar.xz"
echo "Creating tar.xz -> $OUT_TARXZ"
# Use GNU tar options for reproducible archives if available
tar --sort=name --mtime='1970-01-01' --owner=0 --group=0 --numeric-owner -cJf "$OUT_TARXZ" .

if [ "${ZIP:-0}" = "1" ] && command -v zip >/dev/null 2>&1; then
  OUT_ZIP="$OUTPUT_DIR/${NAME}.zip"
  echo "Creating zip -> $OUT_ZIP"
  zip -r -9 "$OUT_ZIP" .
fi

popd >/dev/null

echo "Archive(s) created in $OUTPUT_DIR";
ls -lh "$OUTPUT_DIR" | sed -n '1,200p'
