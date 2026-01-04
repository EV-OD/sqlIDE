#!/usr/bin/env bash
set -euo pipefail

# Remove the project's MariaDB installation from the current user's machine.
# - Attempts graceful stop if pid file exists or kills mariadbd by path
# - Removes install directory
# Usage: bash scripts/remove-project-mariadb.sh

OS="$(uname -s)"
DEST=""
case "$OS" in
  Linux)
    if [ -n "${XDG_DATA_HOME:-}" ]; then
      BASE="$XDG_DATA_HOME"
    else
      BASE="$HOME/.local/share"
    fi
    DEST="$BASE/er-maker/mariadb"
    ;;
  Darwin)
    BASE="$HOME/Library/Application Support"
    DEST="$BASE/er-maker/mariadb"
    ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    # Windows: prefer LOCALAPPDATA
    if [ -n "${LOCALAPPDATA:-}" ]; then
      DEST="$LOCALAPPDATA/er-maker/mariadb"
    else
      echo "Windows detected but LOCALAPPDATA not set; please remove the folder manually." >&2
      exit 2
    fi
    ;;
  *)
    echo "Unsupported OS: $OS" >&2
    exit 2
    ;;
esac

if [ ! -d "$DEST" ]; then
  echo "No project MariaDB installation found at: $DEST"
  exit 0
fi

echo "Stopping MariaDB at: $DEST"
# Try using PID file first
PIDFILE="$DEST/mariadb.pid"
if [ -f "$PIDFILE" ]; then
  PID="$(cat "$PIDFILE" || true)"
  if [ -n "$PID" ]; then
    echo "Found pid $PID; attempting graceful shutdown"
    if kill -TERM "$PID" >/dev/null 2>&1; then
      sleep 1
      # wait a little for shutdown
      for i in {1..5}; do
        if kill -0 "$PID" >/dev/null 2>&1; then
          sleep 1
        else
          break
        fi
      done
    fi
    # if still running, try kill -9
    if kill -0 "$PID" >/dev/null 2>&1; then
      echo "Process still running; sending SIGKILL"
      kill -KILL "$PID" >/dev/null 2>&1 || true
    fi
  fi
  # remove stale pid file
  rm -f "$PIDFILE" || true
fi

# Fallback: kill any mariadbd whose path matches this install
if command -v pkill >/dev/null 2>&1; then
  pkill -f "$DEST/bin/mariadbd" || true
fi

# On mac/linux attempt to stop child processes via pgrep too
if command -v pgrep >/dev/null 2>&1; then
  pgrep -f "$DEST/bin/mariadbd" | xargs -r -n1 kill -TERM || true
  sleep 1
  pgrep -f "$DEST/bin/mariadbd" | xargs -r -n1 kill -KILL || true
fi

# Remove install directory
echo "Removing directory: $DEST"
rm -rf "$DEST"

if [ ! -d "$DEST" ]; then
  echo "Removed project MariaDB installation: $DEST"
  exit 0
else
  echo "Failed to remove $DEST (check permissions)" >&2
  exit 1
fi
