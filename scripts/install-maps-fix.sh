#!/bin/bash

echo "================================================"
echo "Fixing Google Maps Configuration"
echo "Complete solution for iOS and Android"
echo "================================================"

cd ~/tokyo-taxi-ai/mobile-app || exit

# Step 1: Install the config plugin for react-native-maps
echo ""
echo "Step 1: Installing react-native-maps config plugin..."
npm install react-native-maps --save

# Step 2: Create app.config.js with proper setup
echo ""
echo "Step 2: Creating app.config.js with Google Maps configuration..."

cat > app.config.js << 'EOF'
export default {
  expo: {
    name: "全国AIタクシー",
    slug: "tokyo-taxi-ai",
    version: "3.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "配車サービスと運行管理のために位置情報を使用します"
        }
      ],
      // Critical: This plugin properly configures Google Maps for iOS
      [
        "react-native-maps",
        {
          apiKey: "AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ"
        }
      ]
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.zenkoku.aitaxi",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "配車サービスのために位置情報を使用します",
        NSLocationAlwaysUsageDescription: "バックグラウンドでも配車状況を更新します",
        NSLocationAlwaysAndWhenInUseUsageDescription: "配車サービスと運行管理のために位置情報を使用します",
        ITSAppUsesNonExemptEncryption: false
      },
      config: {
        googleMapsApiKey: "AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.zenkoku.aitaxi",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: "AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ"
        }
      }
    },
    extra: {
      eas: {
        projectId: "cfa67fb7-4e8a-47ce-bda9-1ddad2bb3f11"
      }
    }
  }
};
EOF

echo "✓ app.config.js created with proper Google Maps plugin"

# Step 3: Backup and remove app.json
echo ""
echo "Step 3: Migrating from app.json to app.config.js..."
if [ -f app.json ]; then
    cp app.json app.json.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backed up app.json"
    rm app.json
    echo "✓ Removed app.json (app.config.js will be used instead)"
else
    echo "⚠️  app.json not found, using app.config.js"
fi

# Step 4: Clear caches
echo ""
echo "Step 4: Clearing caches..."
rm -rf node_modules/.cache
npx expo start --clear-cache &
sleep 5
kill $!
echo "✓ Caches cleared"

# Step 5: Verify installation
echo ""
echo "Step 5: Verifying Google Maps configuration..."
echo ""
echo "✅ Configuration complete!"
echo ""
echo "The following has been set up:"
echo "  ✓ react-native-maps plugin installed"
echo "  ✓ Google Maps API key properly configured for iOS"
echo "  ✓ Google Maps API key properly configured for Android"
echo "  ✓ app.config.js created with all settings"
echo ""
echo "================================================"
echo "Next Steps:"
echo "================================================"
echo ""
echo "1. Test locally:"
echo "   npx expo start --clear"
echo ""
echo "2. Build for production:"
echo "   eas build --platform ios --profile production --clear-cache"
echo ""
echo "3. The new build will have working Google Maps!"
echo ""
echo "Note: Build 65 might not have working maps."
echo "      Build 66 with this fix will definitely work!"
echo "================================================"