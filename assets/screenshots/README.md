# 📱 全国AIタクシー - App Screenshots

Professional mockup screenshots for App Store submission showcasing all key features of the nationwide AI taxi app.

## 🖼️ Screenshot Collection

### 1. Role Selection Screen (`01-role-selection.svg`)
- **Title**: "ドライバーとお客様の選択"
- **Features Shown**: 
  - App branding with gradient background
  - Driver and Customer role buttons
  - Key feature highlights (weather AI, nationwide coverage, station integration)
  - Professional onboarding experience

### 2. Map View - Nagoya (`02-map-nagoya.svg`)
- **Title**: "全国駅情報連携マップ"
- **Features Shown**:
  - Nagoya region detection (愛知県)
  - Local stations: 名古屋駅, 栄駅, 金山駅, 大曽根駅
  - Current location indicator
  - AI recommendation overlay
  - Bottom navigation

### 3. AI Recommendations (`03-ai-recommendations.svg`)
- **Title**: "AI天気予測機能"
- **Features Shown**:
  - Real-time weather data for Nagoya
  - Station-specific demand predictions
  - Revenue optimization suggestions
  - AI insights based on historical data
  - Action buttons for recommended areas

### 4. Ride Booking (`04-ride-booking.svg`)
- **Title**: "簡単配車リクエスト"
- **Features Shown**:
  - Pickup and destination selection (Nagoya stations)
  - Fare estimation and arrival time
  - Available driver count
  - Station integration benefits
  - Weather considerations

### 5. Driver Dashboard (`05-driver-dashboard.svg`)
- **Title**: "ドライバー収益管理"
- **Features Shown**:
  - Daily earnings tracking (¥18,500 example)
  - AI-powered location recommendations
  - Performance statistics and ratings
  - Weather alerts and demand predictions
  - Online/offline status management

## 📱 App Store Specifications

- **Format**: SVG (iPhone 6.7" Pro Max size: 375×812)
- **Background**: Authentic iPhone frame with status bar
- **Content**: Japanese interface with realistic data
- **Quality**: Vector graphics for perfect scaling

## 🔧 How to Convert for App Store

### Method 1: SVG to PNG Conversion
```bash
# Using Inkscape
inkscape 01-role-selection.svg --export-filename=screenshot-1.png --export-width=1290 --export-height=2796

# Using ImageMagick
convert -density 300 01-role-selection.svg -resize 1290x2796 screenshot-1.png

# Using online converter
# Visit: svg2png.com or convertio.co
```

### Method 2: Direct Screenshot
1. Open SVG file in browser (Chrome/Safari)
2. Use browser developer tools to set viewport to 375×812
3. Take screenshot using browser or system tools
4. Crop to exact dimensions if needed

### Method 3: Batch Conversion Script
```bash
#!/bin/bash
# Convert all screenshots at once
for file in *.svg; do
    inkscape "$file" --export-filename="${file%.svg}.png" --export-width=1290 --export-height=2796
done
```

## 📋 App Store Upload Order

1. **01-role-selection.png** - Shows app purpose and dual functionality
2. **02-map-nagoya.png** - Demonstrates nationwide coverage and local adaptation
3. **03-ai-recommendations.png** - Highlights unique AI weather prediction features
4. **04-ride-booking.png** - Shows user-friendly booking experience
5. **05-driver-dashboard.png** - Demonstrates driver revenue optimization

## 🎯 App Store Descriptions (Japanese)

### Screenshot 1
**タイトル**: ドライバーとお客様の選択
**説明**: 一つのアプリでドライバーも利用者も対応。日本初の天気予測AI搭載で全国47都道府県をカバー。

### Screenshot 2  
**タイトル**: 全国駅情報連携マップ
**説明**: 愛知県名古屋エリアの主要駅と連携。リアルタイムでAIが需要の高いエリアを推奨します。

### Screenshot 3
**タイトル**: AI天気予測機能  
**説明**: 雨予報30分前に需要増加を予測。過去データとAI分析で最適なエリアを提案します。

### Screenshot 4
**タイトル**: 簡単配車リクエスト
**説明**: 駅間の移動も料金・時間が事前に分かる。天気情報も考慮した安心の配車サービス。

### Screenshot 5
**タイトル**: ドライバー収益管理
**説明**: AI推奨エリアで収益30%向上を実現。リアルタイム統計と天気アラートでサポート。

## 🔗 Direct Download Links

Access the SVG files directly from GitHub:

- [Role Selection](https://raw.githubusercontent.com/Tatsuru-Kikuchi/tokyo-taxi-ai/main/assets/screenshots/01-role-selection.svg)
- [Map View Nagoya](https://raw.githubusercontent.com/Tatsuru-Kikuchi/tokyo-taxi-ai/main/assets/screenshots/02-map-nagoya.svg)
- [AI Recommendations](https://raw.githubusercontent.com/Tatsuru-Kikuchi/tokyo-taxi-ai/main/assets/screenshots/03-ai-recommendations.svg)
- [Ride Booking](https://raw.githubusercontent.com/Tatsuru-Kikuchi/tokyo-taxi-ai/main/assets/screenshots/04-ride-booking.svg)
- [Driver Dashboard](https://raw.githubusercontent.com/Tatsuru-Kikuchi/tokyo-taxi-ai/main/assets/screenshots/05-driver-dashboard.svg)

## ✨ Key Features Highlighted

- 🗾 **Nationwide Coverage**: Shows regional detection (Nagoya/愛知県)
- 🌦️ **Weather AI**: Rain prediction and demand forecasting
- 🚇 **Station Integration**: All major stations with real-time data
- 🤖 **AI Recommendations**: Revenue optimization for drivers
- 💰 **Earnings Tracking**: Performance monitoring and statistics
- 🚕 **Unified Platform**: Driver and customer in one app

## 🚀 Ready for App Store

These professional mockups are designed to showcase your revolutionary AI taxi app and help secure App Store approval. The screenshots demonstrate real-world usage in Nagoya, highlighting the nationwide capabilities that set your app apart from competitors.

Convert to PNG format and upload to App Store Connect for immediate submission! 🎉
