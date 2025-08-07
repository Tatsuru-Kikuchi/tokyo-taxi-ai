# 🚕 Tokyo AI Taxi Platform

## Overview
AI-powered taxi platform for Tokyo with weather-based demand prediction. One app with both driver and customer modes.

## Features
- 🌧️ **Weather Prediction**: Pre-position taxis before rain for surge demand
- 👤 **Customer Mode**: Book taxis, LINE integration, real-time tracking
- 🚗 **Driver Mode**: Receive requests, AI recommendations, earnings tracking
- 🤖 **AI Optimization**: 30% revenue increase through smart positioning
- 📲 **LINE Integration**: Chat booking for customers

## Project Structure
```
tokyo-taxi-ai/
├── mobile-app/          # React Native app (Driver + Customer modes)
├── backend/             # Node.js + Express + Socket.io server
├── shared/              # Shared utilities and constants
└── docs/                # Documentation
```

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Mobile App
```bash
cd mobile-app
npm install
npx expo start
```

## Current Status
- ✅ Backend API complete
- ✅ WebSocket real-time communication
- ✅ Driver mode implemented
- ✅ Customer mode implemented
- ✅ Role selection screen
- ✅ TestFlight approved
- 🚧 LINE integration in progress

## Version History
- v2.0.0 - Added customer mode, unified app
- v1.2.0 - Driver app submitted to Apple
- v1.0.0 - Initial driver-only version
