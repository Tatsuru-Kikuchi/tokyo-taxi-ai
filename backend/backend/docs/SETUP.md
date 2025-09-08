# Setup Guide for Tokyo Taxi AI

## Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Firebase account
- OpenWeatherMap API key (optional)
- LINE Official Account (optional)
- iOS device or simulator for testing

## 1. Clone the Repository

```bash
git clone https://github.com/Tatsuru-Kikuchi/tokyo-taxi-ai.git
cd tokyo-taxi-ai
```

## 2. Backend Setup

### Install Dependencies
```bash
cd backend
npm install
```

### Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Go to Project Settings > Service Accounts
4. Generate new private key
5. Save as `backend/serviceAccountKey.json`
6. **Important**: This file is already in `.gitignore` - never commit it!

### Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add:
- `OPENWEATHER_API_KEY`: Your OpenWeatherMap API key
- `PORT`: Server port (default 3000)

### Start Backend Server
```bash
npm run dev
```

You should see:
```
🚕 Tokyo Taxi Backend running on port 3000
📡 WebSocket ready for connections
🔥 Firebase connected
🌦️ Weather API: Configured/Not configured
```

## 3. Mobile App Setup

### Install Dependencies
```bash
cd ../mobile-app
npm install
```

### Configure Backend URL

1. Find your local IP address:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. Update in both screen files:
   - `screens/CustomerScreen.js`
   - `screens/DriverScreen.js`
   
   ```javascript
   const BACKEND_URL = 'http://YOUR_IP:3000';
   ```

### Configure LINE (Optional)

1. Create [LINE Official Account](https://www.linebiz.com/jp/entry/)
2. Get your LINE ID (like @abc123)
3. Update in `screens/CustomerScreen.js`:
   ```javascript
   const LINE_OA_ID = '@your_actual_line_id';
   ```

### Start Development Server
```bash
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

## 4. Testing the Complete Flow

### Test Customer Mode
1. Open app and select "Customer Mode"
2. Enter pickup and destination
3. Tap "Request Ride"
4. Watch for driver acceptance

### Test Driver Mode
1. Open app in another device/simulator
2. Select "Driver Mode"
3. Go online
4. Accept incoming ride requests

### Test Role Switching
1. Use the switch button in header
2. App remembers your last selection

## 5. Building for Production

### iOS Build
```bash
cd mobile-app
npx eas build --platform ios --profile production
```

### Android Build
```bash
npx eas build --platform android --profile production
```

## 6. Deployment

### Backend Deployment Options

#### Railway (Recommended)
1. Push to GitHub
2. Connect GitHub repo to Railway
3. Add environment variables
4. Deploy

#### Heroku
1. Install Heroku CLI
2. Create app: `heroku create tokyo-taxi-backend`
3. Add buildpack: `heroku buildpacks:set heroku/nodejs`
4. Deploy: `git push heroku main`

### Mobile App Submission

#### iOS App Store
1. Build with EAS: `npx eas build --platform ios`
2. Submit: `npx eas submit -p ios`
3. Complete App Store Connect listing

#### Google Play Store
1. Build with EAS: `npx eas build --platform android`
2. Submit: `npx eas submit -p android`
3. Complete Play Console listing

## Troubleshooting

### Backend won't start
- Check if `serviceAccountKey.json` exists
- Verify Firebase project is set up
- Check if port 3000 is free

### Can't connect to backend from app
- Verify backend is running
- Check IP address in app configuration
- Ensure devices are on same network
- Check firewall settings

### Build failures
- Run `npm install` in both directories
- Clear cache: `npx expo start -c`
- Delete node_modules and reinstall

## Support

For issues, please check the [GitHub Issues](https://github.com/Tatsuru-Kikuchi/tokyo-taxi-ai/issues) page.