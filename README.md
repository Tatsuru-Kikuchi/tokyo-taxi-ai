# 🚕 全国AIタクシー Backend

## Version
3.0.1

## Setup Instructions

### 1. Install Dependencies
\```bash
npm install
\```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your API keys:
\```bash
cp .env.example .env
\```

### 3. Run Development Server
\```bash
npm run dev
\```

### 4. Run Production Server
\```bash
npm start
\```

## Directory Structure
\```
backend/
├── server.js              # Main server file
├── config/               # Configuration files
├── services/            # Service modules
├── data/               # Static data
└── backup/            # Backup files (git ignored)
\```

## API Endpoints

### Health Check
- GET `/health` - Server health status

### Train APIs
- GET `/api/trains/schedule` - Get train schedules
- POST `/api/trains/delays` - Check for delays

### Booking APIs
- POST `/api/bookings/create` - Create new booking
- GET `/api/bookings/:id` - Get booking details

### Driver APIs
- GET `/api/drivers/nearby` - Find nearby drivers
- GET `/api/drivers/online` - List online drivers

### Payment APIs
- POST `/api/payment/credit-card` - Process credit card (mock)
- POST `/api/payment/ic-card` - Process IC card (mock)

## Deployment

### Railway
1. Set root directory to `backend`
2. Set start command to `npm start`
3. Add environment variables in Railway dashboard

### Local Testing
\```bash
npm run dev
\```

## Security Notes
- Never commit `.env` file
- Never commit `serviceAccountKey.json`
- Keep all API keys secure
\```

## 4. Updated package.json
```json
{
  "name": "zenkoku-ai-taxi-backend",
  "version": "3.0.1",
  "description": "全国AIタクシー Backend Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Test mode\" && exit 0",
    "clean": "rm -rf node_modules package-lock.json && npm install"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "socket.io": "^4.6.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "taxi",
    "japan",
    "transportation",
    "api",
    "realtime"
  ],
  "author": "Tatsuru Kikuchi",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/tatsuru-kikuchi/tokyo-taxi-ai"
  }
}
