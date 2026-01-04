#!/usr/bin/env zsh
set -euo pipefail

# Generates a user-specific my.cnf from a template.
# Modes:
#   dev  - replace {{PROJECT_ROOT}} with the repo root (default)
#   dist - produce a distribution-friendly my.cnf with relative paths
# Usage: `scripts/generate-mycnf.sh [output-path] [mode]`

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TEMPLATE_DEV="$PROJECT_ROOT/src-tauri/bundled/mariadb/linux-x86_64/my.cnf.template"
TEMPLATE_DIST="$PROJECT_ROOT/src-tauri/bundled/mariadb/linux-x86_64/my.cnf.dist.template"
DEFAULT_OUTPUT="$PROJECT_ROOT/src-tauri/bundled/mariadb/linux-x86_64/my.cnf"
OUTPUT_PATH="${1:-$DEFAULT_OUTPUT}"
MODE="${2:-dev}"

case "$MODE" in
  dev)
    TEMPLATE_PATH="$TEMPLATE_DEV"
    PLACEHOLDER_FROM="{{PROJECT_ROOT}}"
    PLACEHOLDER_TO="$PROJECT_ROOT"
    ;;
  dist)
    TEMPLATE_PATH="$TEMPLATE_DIST"
    # For dist we prefer relative paths; no absolute replacement needed,
    # but keep a placeholder in case packaging wants to set a base dir.
    PLACEHOLDER_FROM="{{BASE_DIR}}"
    PLACEHOLDER_TO="."
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Supported modes: dev, dist" >&2
    exit 1
    ;;
esac

if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "Template not found: $TEMPLATE_PATH" >&2
  exit 1
fi

echo "Generating my.cnf -> $OUTPUT_PATH (mode=$MODE)"

# Replace placeholder (if present) and write output.
mkdir -p "$(dirname "$OUTPUT_PATH")"
sed "s|${PLACEHOLDER_FROM}|${PLACEHOLDER_TO}|g" "$TEMPLATE_PATH" > "$OUTPUT_PATH"

chmod 644 "$OUTPUT_PATH" || true
echo "Done. You can now start the bundled MariaDB using the generated my.cnf."
