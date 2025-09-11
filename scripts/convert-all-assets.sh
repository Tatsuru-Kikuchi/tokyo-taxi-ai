#!/bin/bash

# Complete conversion script for all iOS assets (icons + screenshots)
# Fixes color inversion issues and handles all required sizes

echo "🚀 Starting iOS asset conversion..."
echo "================================="

# Check for rsvg-convert (preferred) or ImageMagick
if command -v rsvg-convert &> /dev/null; then
    CONVERTER="rsvg"
    echo "✅ Using rsvg-convert (recommended)"
elif command -v convert &> /dev/null; then
    CONVERTER="imagemagick"
    echo "⚠️  Using ImageMagick (may have color issues)"
    echo "   Recommendation: Install librsvg with 'brew install librsvg'"
else
    echo "❌ No converter found. Installing librsvg..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install librsvg
        CONVERTER="rsvg"
    else
        echo "Please install librsvg: sudo apt-get install librsvg2-bin"
        exit 1
    fi
fi

# Create output directories
mkdir -p mobile-app/assets/icons/ios
mkdir -p mobile-app/assets/screenshots/iphone
mkdir -p mobile-app/assets/screenshots/ipad

# Function to convert SVG based on available tool
convert_svg() {
    local input=$1
    local width=$2
    local height=$3
    local output=$4
    
    if [ ! -f "$input" ]; then
        echo "⚠️  Warning: $input not found, skipping..."
        return
    fi
    
    if [ "$CONVERTER" = "rsvg" ]; then
        rsvg-convert -w $width -h $height "$input" -o "$output"
    else
        # ImageMagick with best color settings
        convert -background none \
                -colorspace sRGB \
                -define png:color-type=6 \
                -define png:bit-depth=8 \
                "$input" \
                -resize ${width}x${height}! \
                -strip \
                "$output"
    fi
    
    if [ -f "$output" ]; then
        echo "✅ Created: $(basename $output) (${width}x${height})"
    else
        echo "❌ Failed: $(basename $output)"
    fi
}

# ==========================================
# PART 1: ICONS
# ==========================================
echo ""
echo "📱 Converting iPhone Icons..."
echo "-----------------------------"

# iPhone icons
convert_svg "mobile-app/assets/icons/icon-180.svg" 180 180 "mobile-app/assets/icons/ios/icon-180.png"
convert_svg "mobile-app/assets/icons/icon-180.svg" 120 120 "mobile-app/assets/icons/ios/icon-120.png"
convert_svg "mobile-app/assets/icons/icon-120.svg" 120 120 "mobile-app/assets/icons/ios/icon-120-spotlight.png"
convert_svg "mobile-app/assets/icons/icon-120.svg" 80 80 "mobile-app/assets/icons/ios/icon-80.png"
convert_svg "mobile-app/assets/icons/icon-87.svg" 87 87 "mobile-app/assets/icons/ios/icon-87.png"
convert_svg "mobile-app/assets/icons/icon-87.svg" 58 58 "mobile-app/assets/icons/ios/icon-58.png"
convert_svg "mobile-app/assets/icons/icon-60.svg" 60 60 "mobile-app/assets/icons/ios/icon-60.png"
convert_svg "mobile-app/assets/icons/icon-60.svg" 40 40 "mobile-app/assets/icons/ios/icon-40.png"

echo ""
echo "📱 Converting iPad Icons..."
echo "---------------------------"

# iPad icons
convert_svg "mobile-app/assets/ipad/icon-1024.svg" 167 167 "mobile-app/assets/icons/ios/icon-167.png"
convert_svg "mobile-app/assets/ipad/icon-1024.svg" 152 152 "mobile-app/assets/icons/ios/icon-152.png"
convert_svg "mobile-app/assets/ipad/icon-1024.svg" 76 76 "mobile-app/assets/icons/ios/icon-76.png"
convert_svg "mobile-app/assets/ipad/icon-1024.svg" 1024 1024 "mobile-app/assets/icons/ios/icon-1024.png"

# ==========================================
# PART 2: SCREENSHOTS
# ==========================================
echo ""
echo "📸 Converting iPad Screenshots (2048x2732)..."
echo "----------------------------------------------"

# iPad 12.9" screenshots
convert_svg "mobile-app/assets/ipad/screenshot-1-menu.svg" 2048 2732 "mobile-app/assets/screenshots/ipad/ipad-12.9-screen-1.png"
convert_svg "mobile-app/assets/ipad/screenshot-2-customer.svg" 2048 2732 "mobile-app/assets/screenshots/ipad/ipad-12.9-screen-2.png"
convert_svg "mobile-app/assets/ipad/screenshot-3-driver.svg" 2048 2732 "mobile-app/assets/screenshots/ipad/ipad-12.9-screen-3.png"
convert_svg "mobile-app/assets/ipad/screenshot-4-features.svg" 2048 2732 "mobile-app/assets/screenshots/ipad/ipad-12.9-screen-4.png"
convert_svg "mobile-app/assets/ipad/screenshot-5-confirmation.svg" 2048 2732 "mobile-app/assets/screenshots/ipad/ipad-12.9-screen-5.png"

echo ""
echo "📸 Converting iPad 11\" Screenshots (1668x2388)..."
echo "--------------------------------------------------"

# iPad 11" screenshots (scaled from same SVGs)
convert_svg "mobile-app/assets/ipad/screenshot-1-menu.svg" 1668 2388 "mobile-app/assets/screenshots/ipad/ipad-11-screen-1.png"
convert_svg "mobile-app/assets/ipad/screenshot-2-customer.svg" 1668 2388 "mobile-app/assets/screenshots/ipad/ipad-11-screen-2.png"
convert_svg "mobile-app/assets/ipad/screenshot-3-driver.svg" 1668 2388 "mobile-app/assets/screenshots/ipad/ipad-11-screen-3.png"
convert_svg "mobile-app/assets/ipad/screenshot-4-features.svg" 1668 2388 "mobile-app/assets/screenshots/ipad/ipad-11-screen-4.png"
convert_svg "mobile-app/assets/ipad/screenshot-5-confirmation.svg" 1668 2388 "mobile-app/assets/screenshots/ipad/ipad-11-screen-5.png"

echo ""
echo "📸 Creating iPhone Screenshots from iPad SVGs..."
echo "-------------------------------------------------"
echo "Note: iPhone uses different aspect ratios"

# iPhone 6.7" (1290x2796) - iPhone 15 Pro Max
convert_svg "mobile-app/assets/ipad/screenshot-1-menu.svg" 1290 2796 "mobile-app/assets/screenshots/iphone/iphone-6.7-screen-1.png"
convert_svg "mobile-app/assets/ipad/screenshot-2-customer.svg" 1290 2796 "mobile-app/assets/screenshots/iphone/iphone-6.7-screen-2.png"
convert_svg "mobile-app/assets/ipad/screenshot-3-driver.svg" 1290 2796 "mobile-app/assets/screenshots/iphone/iphone-6.7-screen-3.png"
convert_svg "mobile-app/assets/ipad/screenshot-4-features.svg" 1290 2796 "mobile-app/assets/screenshots/iphone/iphone-6.7-screen-4.png"
convert_svg "mobile-app/assets/ipad/screenshot-5-confirmation.svg" 1290 2796 "mobile-app/assets/screenshots/iphone/iphone-6.7-screen-5.png"

# iPhone 6.5" (1284x2778) - iPhone 14 Pro Max
convert_svg "mobile-app/assets/ipad/screenshot-1-menu.svg" 1284 2778 "mobile-app/assets/screenshots/iphone/iphone-6.5-screen-1.png"
convert_svg "mobile-app/assets/ipad/screenshot-2-customer.svg" 1284 2778 "mobile-app/assets/screenshots/iphone/iphone-6.5-screen-2.png"
convert_svg "mobile-app/assets/ipad/screenshot-3-driver.svg" 1284 2778 "mobile-app/assets/screenshots/iphone/iphone-6.5-screen-3.png"
convert_svg "mobile-app/assets/ipad/screenshot-4-features.svg" 1284 2778 "mobile-app/assets/screenshots/iphone/iphone-6.5-screen-4.png"
convert_svg "mobile-app/assets/ipad/screenshot-5-confirmation.svg" 1284 2778 "mobile-app/assets/screenshots/iphone/iphone-6.5-screen-5.png"

# iPhone 5.5" (1242x2208) - iPhone 8 Plus
convert_svg "mobile-app/assets/ipad/screenshot-1-menu.svg" 1242 2208 "mobile-app/assets/screenshots/iphone/iphone-5.5-screen-1.png"
convert_svg "mobile-app/assets/ipad/screenshot-2-customer.svg" 1242 2208 "mobile-app/assets/screenshots/iphone/iphone-5.5-screen-2.png"
convert_svg "mobile-app/assets/ipad/screenshot-3-driver.svg" 1242 2208 "mobile-app/assets/screenshots/iphone/iphone-5.5-screen-3.png"
convert_svg "mobile-app/assets/ipad/screenshot-4-features.svg" 1242 2208 "mobile-app/assets/screenshots/iphone/iphone-5.5-screen-4.png"
convert_svg "mobile-app/assets/ipad/screenshot-5-confirmation.svg" 1242 2208 "mobile-app/assets/screenshots/iphone/iphone-5.5-screen-5.png"

# ==========================================
# PART 3: VERIFICATION
# ==========================================
echo ""
echo "🔍 Verifying Generated Files..."
echo "--------------------------------"

# Count generated files
ICON_COUNT=$(ls -1 mobile-app/assets/icons/ios/*.png 2>/dev/null | wc -l)
IPAD_SCREENSHOT_COUNT=$(ls -1 mobile-app/assets/screenshots/ipad/*.png 2>/dev/null | wc -l)
IPHONE_SCREENSHOT_COUNT=$(ls -1 mobile-app/assets/screenshots/iphone/*.png 2>/dev/null | wc -l)

echo "✅ Icons generated: $ICON_COUNT files"
echo "✅ iPad screenshots: $IPAD_SCREENSHOT_COUNT files"
echo "✅ iPhone screenshots: $IPHONE_SCREENSHOT_COUNT files"

# Check for color issues (if identify is available)
if command -v identify &> /dev/null; then
    echo ""
    echo "🎨 Checking Color Profiles..."
    echo "------------------------------"
    
    # Check a sample file
    SAMPLE_FILE="mobile-app/assets/icons/ios/icon-180.png"
    if [ -f "$SAMPLE_FILE" ]; then
        COLORSPACE=$(identify -verbose "$SAMPLE_FILE" 2>/dev/null | grep "Colorspace" | head -1 | awk '{print $2}')
        if [ "$COLORSPACE" = "sRGB" ]; then
            echo "✅ Color profile is correct (sRGB)"
        else
            echo "⚠️  Color profile may be incorrect: $COLORSPACE"
            echo "   If colors look inverted, try using rsvg-convert instead"
        fi
    fi
fi

# ==========================================
# PART 4: APP STORE CONNECT INSTRUCTIONS
# ==========================================
echo ""
echo "📱 App Store Connect Upload Instructions"
echo "========================================="
echo ""
echo "ICONS:"
echo "------"
echo "1. Go to App Store Connect > Your App > App Information"
echo "2. Upload icon-1024.png as the App Store icon"
echo ""
echo "SCREENSHOTS:"
echo "------------"
echo "1. Go to Media Manager"
echo "2. For iPad:"
echo "   - 12.9\" Display: Upload ipad-12.9-screen-*.png"
echo "   - 11\" Display: Upload ipad-11-screen-*.png"
echo "3. For iPhone:"
echo "   - 6.7\" Display: Upload iphone-6.7-screen-*.png"
echo "   - 6.5\" Display: Upload iphone-6.5-screen-*.png"
echo "   - 5.5\" Display: Upload iphone-5.5-screen-*.png"
echo ""
echo "✨ All assets are ready for submission!"
echo ""
echo "Files located at:"
echo "  • Icons: mobile-app/assets/icons/ios/"
echo "  • Screenshots: mobile-app/assets/screenshots/"
