#!/bin/bash

# Convert Icon SVGs to PNG files with proper color handling
# This script fixes color inversion issues

echo "Converting icon SVGs to PNG files with correct colors..."

# Check for rsvg-convert (preferred) or ImageMagick
if command -v rsvg-convert &> /dev/null; then
    CONVERTER="rsvg"
    echo "Using rsvg-convert (recommended)..."
elif command -v convert &> /dev/null; then
    CONVERTER="imagemagick"
    echo "Using ImageMagick..."
else
    echo "Installing rsvg-convert (recommended for SVG conversion)..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install librsvg
        CONVERTER="rsvg"
    else
        echo "Please install librsvg: sudo apt-get install librsvg2-bin"
        exit 1
    fi
fi

# Create output directory
mkdir -p mobile-app/assets/icons/ios

# Function to convert SVG based on available tool
convert_icon() {
    local input=$1
    local width=$2
    local height=$3
    local output=$4
    
    if [ "$CONVERTER" = "rsvg" ]; then
        rsvg-convert -w $width -h $height "$input" -o "$output"
    else
        # ImageMagick with color fix
        convert -background none -colorspace sRGB \
                -define png:color-type=6 \
                "$input" \
                -resize ${width}x${height} \
                -strip \
                "$output"
    fi
    
    echo "Created: $output (${width}x${height})"
}

echo "Converting iPhone icons..."

# iPhone App Icon 60pt @3x
convert_icon "mobile-app/assets/icons/icon-180.svg" 180 180 "mobile-app/assets/icons/ios/icon-180.png"

# iPhone App Icon 60pt @2x
convert_icon "mobile-app/assets/icons/icon-180.svg" 120 120 "mobile-app/assets/icons/ios/icon-120.png"

# iPhone Spotlight 40pt @3x
convert_icon "mobile-app/assets/icons/icon-120.svg" 120 120 "mobile-app/assets/icons/ios/icon-120-spotlight.png"

# iPhone Spotlight 40pt @2x
convert_icon "mobile-app/assets/icons/icon-120.svg" 80 80 "mobile-app/assets/icons/ios/icon-80.png"

# iPhone Settings 29pt @3x
convert_icon "mobile-app/assets/icons/icon-87.svg" 87 87 "mobile-app/assets/icons/ios/icon-87.png"

# iPhone Settings 29pt @2x
convert_icon "mobile-app/assets/icons/icon-87.svg" 58 58 "mobile-app/assets/icons/ios/icon-58.png"

# iPhone Notification 20pt @3x
convert_icon "mobile-app/assets/icons/icon-60.svg" 60 60 "mobile-app/assets/icons/ios/icon-60.png"

# iPhone Notification 20pt @2x
convert_icon "mobile-app/assets/icons/icon-60.svg" 40 40 "mobile-app/assets/icons/ios/icon-40.png"

echo ""
echo "Converting iPad icons..."

# iPad Pro 83.5pt @2x
convert_icon "mobile-app/assets/ipad/icon-1024.svg" 167 167 "mobile-app/assets/icons/ios/icon-167.png"

# iPad 76pt @2x
convert_icon "mobile-app/assets/ipad/icon-1024.svg" 152 152 "mobile-app/assets/icons/ios/icon-152.png"

# iPad 76pt @1x
convert_icon "mobile-app/assets/ipad/icon-1024.svg" 76 76 "mobile-app/assets/icons/ios/icon-76.png"

# App Store Icon
convert_icon "mobile-app/assets/ipad/icon-1024.svg" 1024 1024 "mobile-app/assets/icons/ios/icon-1024.png"

echo ""
echo "✅ Icon conversion complete!"
echo ""

# Verify colors (optional)
if command -v identify &> /dev/null; then
    echo "Verifying color profiles..."
    for file in mobile-app/assets/icons/ios/*.png; do
        info=$(identify -verbose "$file" | grep -E "Colorspace|Type" | head -2)
        filename=$(basename "$file")
        echo "$filename: $info" | tr '\n' ' '
        echo ""
    done
fi

echo ""
echo "📱 All icons ready for iOS submission!"
echo "Location: mobile-app/assets/icons/ios/"
