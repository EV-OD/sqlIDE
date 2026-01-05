#!/bin/bash

# SqlIde Desktop Icon Generator
# Requires: imagemagick (convert), librsvg2-bin (rsvg-convert), icnsutils (png2icns)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ICONS_DIR="$PROJECT_DIR/src-tauri/icons"
SVG_FILE="$SCRIPT_DIR/icon.svg"

echo "=== SqlIde Desktop Icon Generator ==="
echo "Icons directory: $ICONS_DIR"

# Create SVG icon - Database/ER diagram themed
cat > "$SVG_FILE" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="dbGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e0e7ff;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  
  <!-- Background rounded square -->
  <rect x="32" y="32" width="448" height="448" rx="80" ry="80" fill="url(#bgGrad)" filter="url(#shadow)"/>
  
  <!-- Left database cylinder -->
  <g transform="translate(90, 140)">
    <!-- Cylinder body -->
    <rect x="0" y="20" width="100" height="140" rx="4" fill="url(#dbGrad)" opacity="0.95"/>
    <!-- Top ellipse -->
    <ellipse cx="50" cy="20" rx="50" ry="20" fill="#ffffff"/>
    <!-- Bottom ellipse -->
    <ellipse cx="50" cy="160" rx="50" ry="20" fill="#c7d2fe"/>
    <!-- Middle lines -->
    <ellipse cx="50" cy="70" rx="50" ry="12" fill="none" stroke="#a5b4fc" stroke-width="2"/>
    <ellipse cx="50" cy="115" rx="50" ry="12" fill="none" stroke="#a5b4fc" stroke-width="2"/>
  </g>
  
  <!-- Right database cylinder -->
  <g transform="translate(322, 140)">
    <!-- Cylinder body -->
    <rect x="0" y="20" width="100" height="140" rx="4" fill="url(#dbGrad)" opacity="0.95"/>
    <!-- Top ellipse -->
    <ellipse cx="50" cy="20" rx="50" ry="20" fill="#ffffff"/>
    <!-- Bottom ellipse -->
    <ellipse cx="50" cy="160" rx="50" ry="20" fill="#c7d2fe"/>
    <!-- Middle lines -->
    <ellipse cx="50" cy="70" rx="50" ry="12" fill="none" stroke="#a5b4fc" stroke-width="2"/>
    <ellipse cx="50" cy="115" rx="50" ry="12" fill="none" stroke="#a5b4fc" stroke-width="2"/>
  </g>
  
  <!-- Connection lines (relationship) -->
  <g stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round">
    <!-- Main horizontal line -->
    <line x1="190" y1="230" x2="322" y2="230"/>
    <!-- Left crow's foot -->
    <line x1="200" y1="220" x2="190" y2="230"/>
    <line x1="200" y1="240" x2="190" y2="230"/>
    <!-- Right crow's foot -->
    <line x1="312" y1="220" x2="322" y2="230"/>
    <line x1="312" y1="240" x2="322" y2="230"/>
  </g>
  
  <!-- Diamond (relationship symbol) in center -->
  <g transform="translate(256, 230)">
    <polygon points="0,-25 30,0 0,25 -30,0" fill="#fbbf24" stroke="#ffffff" stroke-width="3"/>
  </g>
  
  <!-- Small key icon on left db -->
  <g transform="translate(125, 195)">
    <circle cx="0" cy="0" r="8" fill="#fbbf24"/>
    <rect x="5" y="-3" width="15" height="6" rx="2" fill="#fbbf24"/>
    <rect x="15" y="3" width="5" height="6" rx="1" fill="#fbbf24"/>
  </g>
  
  <!-- Small key icon on right db -->
  <g transform="translate(357, 195)">
    <circle cx="0" cy="0" r="8" fill="#fbbf24"/>
    <rect x="5" y="-3" width="15" height="6" rx="2" fill="#fbbf24"/>
    <rect x="15" y="3" width="5" height="6" rx="1" fill="#fbbf24"/>
  </g>
  
  <!-- "ER" text at bottom -->
  <text x="256" y="385" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="64" fill="#ffffff" opacity="0.9">ER</text>
</svg>
EOF

echo "Created SVG icon"

# Function to convert SVG to PNG at specific size
convert_to_png() {
    local size=$1
    local output=$2
    
    if command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w "$size" -h "$size" "$SVG_FILE" -o "$output"
    elif command -v convert &> /dev/null; then
        convert -background none -density 300 -resize "${size}x${size}" "$SVG_FILE" "$output"
    else
        echo "Error: Neither rsvg-convert nor ImageMagick convert found"
        exit 1
    fi
    echo "Created: $output (${size}x${size})"
}

# Generate all PNG sizes
echo ""
echo "Generating PNG icons..."

convert_to_png 32 "$ICONS_DIR/32x32.png"
convert_to_png 128 "$ICONS_DIR/128x128.png"
convert_to_png 256 "$ICONS_DIR/128x128@2x.png"
convert_to_png 512 "$ICONS_DIR/icon.png"

# Windows Store icons
convert_to_png 30 "$ICONS_DIR/Square30x30Logo.png"
convert_to_png 44 "$ICONS_DIR/Square44x44Logo.png"
convert_to_png 71 "$ICONS_DIR/Square71x71Logo.png"
convert_to_png 89 "$ICONS_DIR/Square89x89Logo.png"
convert_to_png 107 "$ICONS_DIR/Square107x107Logo.png"
convert_to_png 142 "$ICONS_DIR/Square142x142Logo.png"
convert_to_png 150 "$ICONS_DIR/Square150x150Logo.png"
convert_to_png 284 "$ICONS_DIR/Square284x284Logo.png"
convert_to_png 310 "$ICONS_DIR/Square310x310Logo.png"
convert_to_png 50 "$ICONS_DIR/StoreLogo.png"

# Generate ICO for Windows
echo ""
echo "Generating Windows ICO..."
if command -v convert &> /dev/null; then
    convert "$ICONS_DIR/32x32.png" "$ICONS_DIR/128x128.png" "$ICONS_DIR/icon.png" "$ICONS_DIR/icon.ico"
    echo "Created: $ICONS_DIR/icon.ico"
else
    echo "Warning: ImageMagick not found, skipping ICO generation"
fi

# Generate ICNS for macOS
echo ""
echo "Generating macOS ICNS..."
if command -v png2icns &> /dev/null; then
    png2icns "$ICONS_DIR/icon.icns" "$ICONS_DIR/icon.png" "$ICONS_DIR/128x128@2x.png" "$ICONS_DIR/128x128.png" "$ICONS_DIR/32x32.png"
    echo "Created: $ICONS_DIR/icon.icns"
elif command -v iconutil &> /dev/null; then
    # macOS native method
    ICONSET_DIR="$ICONS_DIR/icon.iconset"
    mkdir -p "$ICONSET_DIR"
    convert_to_png 16 "$ICONSET_DIR/icon_16x16.png"
    convert_to_png 32 "$ICONSET_DIR/icon_16x16@2x.png"
    convert_to_png 32 "$ICONSET_DIR/icon_32x32.png"
    convert_to_png 64 "$ICONSET_DIR/icon_32x32@2x.png"
    convert_to_png 128 "$ICONSET_DIR/icon_128x128.png"
    convert_to_png 256 "$ICONSET_DIR/icon_128x128@2x.png"
    convert_to_png 256 "$ICONSET_DIR/icon_256x256.png"
    convert_to_png 512 "$ICONSET_DIR/icon_256x256@2x.png"
    convert_to_png 512 "$ICONSET_DIR/icon_512x512.png"
    convert_to_png 1024 "$ICONSET_DIR/icon_512x512@2x.png"
    iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/icon.icns"
    rm -rf "$ICONSET_DIR"
    echo "Created: $ICONS_DIR/icon.icns"
else
    echo "Warning: Neither png2icns nor iconutil found, skipping ICNS generation"
fi

echo ""
echo "=== Icon generation complete ==="
