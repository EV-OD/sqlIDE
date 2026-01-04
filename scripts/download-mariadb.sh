#!/bin/bash

# Configuration
# You can override these by exporting env vars, e.g.
# MARIADB_VERSION=10.6.12 MINIMAL=1 ./scripts/download-mariadb.sh
MARIADB_VERSION="${MARIADB_VERSION:-10.6.12}"
PLATFORM="linux-systemd-x86_64"
FILENAME="mariadb-${MARIADB_VERSION}-${PLATFORM}.tar.gz"
URL="https://archive.mariadb.org/mariadb-${MARIADB_VERSION}/bintar-${PLATFORM}/${FILENAME}"
TEMP_DIR="temp_dl"
TARGET_DIR="src-tauri/bundled/mariadb/linux-x86_64"

# If MINIMAL=1, copy only these directories from the tarball to reduce size
# Minimal set usually required for runtime: bin, support-files, scripts
MINIMAL="${MINIMAL:-1}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting MariaDB Bundle Setup...${NC}"

# 1. Create temp directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# 2. Download with resume capability
if [ -f "$FILENAME" ]; then
    echo -e "${BLUE}Found existing file, attempting to resume/verify...${NC}"
fi

echo -e "${GREEN}Downloading MariaDB ${MARIADB_VERSION} (Generic Linux)...${NC}"
# -c: continue getting a partially-downloaded file
# --show-progress: display the progress bar
wget -c --show-progress "$URL"

# 3. Extract
echo -e "${GREEN}Extracting archive...${NC}"
tar -xf "$FILENAME"

# 4. Prepare target directory
echo -e "${GREEN}Preparing target directory: ${TARGET_DIR}${NC}"
cd ..
mkdir -p "$TARGET_DIR"

# Clear existing bundle to avoid mixing versions
# Be careful: only delete if it looks like our bundle dir
if [ -d "$TARGET_DIR" ]; then
    rm -rf "${TARGET_DIR:?}"/*
fi

# 5. Install
echo -e "${GREEN}Installing to bundle location...${NC}"
SOURCE_DIR="${TEMP_DIR}/mariadb-${MARIADB_VERSION}-${PLATFORM}"

if [ -d "$SOURCE_DIR" ]; then
    if [ "$MINIMAL" = "1" ] || [ "$MINIMAL" = "true" ]; then
        echo -e "${BLUE}Installing minimal bundle (bin, support-files, scripts)...${NC}"
        for d in bin support-files scripts; do
            if [ -d "$SOURCE_DIR/$d" ]; then
                mkdir -p "$TARGET_DIR/$d"
                cp -r "$SOURCE_DIR/$d/"* "$TARGET_DIR/$d/"
            fi
        done
        # copy essential defaults if present
        if [ -f "$SOURCE_DIR/support-files/my-default.cnf" ]; then
            mkdir -p "$TARGET_DIR/support-files"
            cp "$SOURCE_DIR/support-files/my-default.cnf" "$TARGET_DIR/support-files/" || true
        fi
        echo -e "${GREEN}Minimal bundle installed successfully!${NC}"
    else
        echo -e "${BLUE}Installing full bundle...${NC}"
        cp -r "$SOURCE_DIR"/* "$TARGET_DIR/"
        echo -e "${GREEN}Full bundle installed successfully!${NC}"
    fi
else
    echo "Error: Extracted directory not found at $SOURCE_DIR"
    exit 1
fi

# 6. Cleanup (Optional - comment out if you want to keep the download)
# echo -e "${BLUE}Cleaning up temporary files...${NC}"
# rm -rf "$TEMP_DIR"

echo -e "${GREEN}Done! MariaDB is ready for bundling.${NC}"
