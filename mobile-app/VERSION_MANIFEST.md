# 📋 VERSION MANIFEST - Build 86

## ✅ CURRENT WORKING VERSION
- **Build Number**: 86
- **Status**: TestFlight Approved
- **Date**: 2024-12-20
- **Expo SDK**: 51.0.0
- **React Native**: 0.74.5
- **Node**: 18.20.0

## 📁 FILE VERSIONS IN THIS PROJECT

| File | Version | Status | Notes |
|------|---------|--------|--------|
| App_Build86_WORKING.js | Build 86 | ✅ WORKING | Navigation fixed |
| CustomerScreen_Build86_NoMaps.js | Build 86 | ✅ WORKING | Placeholder maps |
| DriverScreen_Build86_NoMaps.js | Build 86 | ✅ WORKING | Hotspot grid |
| package_Build86_SDK51_STABLE.json | Build 86 | ✅ STABLE | DO NOT change versions |
| app_Build86_TestFlight.json | Build 86 | ✅ APPROVED | Current production |
| eas_Build86_AutoIncrement.json | Build 86 | ✅ WORKING | Auto build numbers |

## ⚠️ CRITICAL - DO NOT CHANGE
1. **Expo SDK**: Must stay at 51.0.0
2. **React Native**: Must stay at 0.74.5
3. **Node**: Must stay at 18.20.0
4. **Maps**: NO react-native-maps (use placeholders)
5. **Slug**: Must stay as "tokyo-taxi-ai"

## 🚫 FAILED VERSIONS (DO NOT USE)
- SDK 53 + RN 0.76.5 = CocoaPods failure
- react-native-maps@1.20.1 = Podfile error
- react-native-maps@1.14.0 = C++ exception
- Node 24.x = Metro bundler crash

## ✅ BUILD COMMAND THAT WORKS
```bash
eas build --platform ios --profile production --clear-cache
