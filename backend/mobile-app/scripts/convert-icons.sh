#!/bin/bash

# Convert iPhone Icon SVGs to PNG files
# This script converts all SVG icons to required PNG sizes for iOS

echo "Converting iPhone icon SVGs to PNG files..."

# Install ImageMagick if not installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install imagemagick
    else
        echo "Please install ImageMagick manually: sudo apt-get install imagemagick"
        exit 1
    fi
fi

# Create output directory
mkdir -p mobile-app/assets/icons/ios

# iPhone icons
echo "Converting icon-180.svg (iPhone App - 60pt @3x)..."
convert mobile-app/assets/icons/icon-180.svg -resize 180x180 mobile-app/assets/icons/ios/icon-180.png

echo "Converting icon-120.svg (iPhone Spotlight - 40pt @3x)..."
convert mobile-app/assets/icons/icon-120.svg -resize 120x120 mobile-app/assets/icons/ios/icon-120.png

echo "Converting icon-87.svg (iPhone Settings - 29pt @3x)..."
convert mobile-app/assets/icons/icon-87.svg -resize 87x87 mobile-app/assets/icons/ios/icon-87.png

echo "Converting icon-60.svg (iPhone Notification - 20pt @3x)..."
convert mobile-app/assets/icons/icon-60.svg -resize 60x60 mobile-app/assets/icons/ios/icon-60.png

# Additional sizes needed for iPhone (generated from main icon)
echo "Generating additional iPhone sizes from icon-180.svg..."

# 60pt @2x
convert mobile-app/assets/icons/icon-180.svg -resize 120x120 mobile-app/assets/icons/ios/icon-120-2x.png

# 40pt @2x
convert mobile-app/assets/icons/icon-120.svg -resize 80x80 mobile-app/assets/icons/ios/icon-80.png

# 29pt @2x
convert mobile-app/assets/icons/icon-87.svg -resize 58x58 mobile-app/assets/icons/ios/icon-58.png

# 20pt @2x
convert mobile-app/assets/icons/icon-60.svg -resize 40x40 mobile-app/assets/icons/ios/icon-40.png

# iPad icons (from the main 1024 icon)
echo "Converting iPad icons..."
convert mobile-app/assets/ipad/icon-1024.svg -resize 1024x1024 mobile-app/assets/icons/ios/icon-1024.png

# iPad Pro 83.5pt @2x
convert mobile-app/assets/ipad/icon-1024.svg -resize 167x167 mobile-app/assets/icons/ios/icon-167.png

# iPad 76pt @2x
convert mobile-app/assets/ipad/icon-1024.svg -resize 152x152 mobile-app/assets/icons/ios/icon-152.png

# iPad 76pt @1x
convert mobile-app/assets/ipad/icon-1024.svg -resize 76x76 mobile-app/assets/icons/ios/icon-76.png

echo "Icon conversion complete!"
echo "All icons saved to mobile-app/assets/icons/ios/"

# List all generated files
echo ""
echo "Generated files:"
ls -la mobile-app/assets/icons/ios/
