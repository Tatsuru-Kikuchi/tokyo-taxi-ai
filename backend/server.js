require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin with production/development logic
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production - from environment variable
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized with environment variable');
  } catch (error) {
    console.error('Failed to parse Firebase service account:', error);
    console.log('⚠️ Running without Firebase');
  }
} else {
  // Development - from file
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized with local file');
  } catch (error) {
    console.log('⚠️ serviceAccountKey.json not found - running without Firebase');
  }
}

// Only initialize Firestore if Firebase is initialized
let db = null;
if (admin.apps.length > 0) {
  db = admin.firestore();
  console.log('✅ Firestore connected');
}

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// OpenWeatherMap configuration
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'bd17578f85cb46d681ca3e4f3bdc9963';
const TOKYO_LAT = 35.6762;
const TOKYO_LON = 139.6503;

// REST API Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Tokyo Taxi Backend API',
    version: '1.0.0',
    endpoints: ['/api/health', '/api/weather/forecast', '/api/drivers/online', '/api/rides']
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Tokyo Taxi Backend Running',
    firebase: admin.apps.length > 0 ? 'connected' : 'not connected',
    timestamp: new Date().toISOString()
  });
});

// Real weather forecast endpoint
app.get('/api/weather/forecast-real', async (req, res) => {
  try {
    if (WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
      return res.status(400).json({ 
        error: 'Weather API key not configured',
        message: 'Please add your OpenWeatherMap API key'
      });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${TOKYO_LAT}&lon=${TOKYO_LON}&appid=${WEATHER_API_KEY}&units=metric`
    );

    const forecasts = response.data.list.slice(0, 8).map(item => ({
      time: new Date(item.dt * 1000).toLocaleTimeString('ja-JP'),
      temp: Math.round(item.main.temp),
      description: item.weather[0].description,
      rain: item.rain ? item.rain['3h'] || 0 : 0,
      humidity: item.main.humidity,
      windSpeed: item.wind.speed
    }));

    const rainComing = forecasts.slice(0, 1).some(f => f.rain > 0);

    res.json({
      location: 'Tokyo',
      current: {
        temp: forecasts[0].temp,
        description: forecasts[0].description,
        humidity: forecasts[0].humidity
      },
      forecasts,
      rainAlert: rainComing,
      message: rainComing ? '雨が予想されます。需要が高まる可能性があります。' : '晴天が続く予報です。'
    });

  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Mock weather endpoint (always works)
app.get('/api/weather/forecast', (req, res) => {
  const mockForecast = {
    location: 'Tokyo',
    current: {
      temp: 22,
      description: 'Partly cloudy',
      humidity: 65
    },
    forecasts: [
      { time: '15:00', temp: 22, rain: 0 },
      { time: '16:00', temp: 21, rain: 0 },
      { time: '17:00', temp: 20, rain: 30 },
      { time: '18:00', temp: 19, rain: 60 },
      { time: '19:00', temp: 19, rain: 40 },
      { time: '20:00', temp: 18, rain: 20 }
    ],
    rainAlert: true,
    message: '17:00頃から雨の予報です。需要増加が予想されます。'
  };
  res.json(mockForecast);
});

// Get online drivers
app.get('/api/drivers/online', async (req, res) => {
  if (!db) {
    return res.json({ count: 0, drivers: [], message: 'Database not connected' });
  }

  try {
    const driversSnapshot = await db.collection('drivers')
      .where('status', '==', 'online')
      .get();
    
    const drivers = [];
    driversSnapshot.forEach(doc => {
      drivers.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ count: drivers.length, drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get active rides
app.get('/api/rides', async (req, res) => {
  if (!db) {
    return res.json({ count: 0, rides: [], message: 'Database not connected' });
  }

  try {
    const ridesSnapshot = await db.collection('rides')
      .where('status', 'in', ['pending', 'accepted', 'in_progress'])
      .get();
    
    const rides = [];
    ridesSnapshot.forEach(doc => {
      rides.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ count: rides.length, rides });
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// WebSocket handling
const connectedDrivers = new Map();
const connectedCustomers = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Driver connects
  socket.on('driver:connect', async (driverData) => {
    console.log('Driver connected:', driverData);
    connectedDrivers.set(socket.id, {
      ...driverData,
      socketId: socket.id,
      status: 'online'
    });

    // Update driver status in Firebase if available
    if (db && driverData.driverId) {
      try {
        await db.collection('drivers').doc(driverData.driverId).set({
          ...driverData,
          status: 'online',
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating driver status:', error);
      }
    }

    // Notify customers of new driver
    io.emit('drivers:update', {
      onlineCount: connectedDrivers.size,
      drivers: Array.from(connectedDrivers.values())
    });

    socket.emit('driver:connected', {
      message: 'ドライバーとして接続されました',
      driverId: driverData.driverId || socket.id
    });
  });

  // Customer connects
  socket.on('customer:connect', (customerData) => {
    console.log('Customer connected:', customerData);
    connectedCustomers.set(socket.id, {
      ...customerData,
      socketId: socket.id
    });

    socket.emit('customer:connected', {
      message: 'お客様として接続されました',
      customerId: customerData.customerId || socket.id,
      onlineDrivers: connectedDrivers.size
    });
  });

  // Customer requests ride
  socket.on('ride:request', async (rideData) => {
    console.log('Ride requested:', rideData);

    let rideId = 'ride_' + Date.now();

    if (db) {
      try {
        const rideRef = await db.collection('rides').add({
          ...rideData,
          status: 'pending',
          customerId: rideData.customerId || socket.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        rideId = rideRef.id;
        console.log('Ride created in Firebase:', rideId);
      } catch (error) {
        console.error('Error creating ride in Firebase:', error);
      }
    }

    // Notify all online drivers
    connectedDrivers.forEach((driver, driverSocketId) => {
      io.to(driverSocketId).emit('ride:new', {
        rideId,
        ...rideData,
        estimatedFare: calculateFare(rideData.distance || 5)
      });
    });

    // Confirm to customer
    socket.emit('ride:requested', {
      rideId,
      message: '配車リクエストを近くのドライバーに送信しました',
      status: 'pending'
    });
  });

  // Driver accepts ride
  socket.on('ride:accept', async (data) => {
    console.log('Driver accepting ride:', data);

    if (db) {
      try {
        await db.collection('rides').doc(data.rideId).update({
          status: 'accepted',
          driverId: data.driverId || socket.id,
          acceptedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const rideDoc = await db.collection('rides').doc(data.rideId).get();
        const rideData = rideDoc.data();

        // Notify customer
        connectedCustomers.forEach((customer, customerSocketId) => {
          if (customer.customerId === rideData.customerId || customerSocketId === rideData.customerId) {
            io.to(customerSocketId).emit('ride:accepted', {
              rideId: data.rideId,
              driverId: data.driverId,
              message: 'ドライバーが配車を承諾しました！',
              estimatedArrival: '約5分'
            });
          }
        });
      } catch (error) {
        console.error('Error accepting ride:', error);
      }
    }

    // Even without DB, notify customer
    socket.emit('ride:accept:success', {
      rideId: data.rideId,
      message: '配車を承諾しました'
    });

    // Notify other drivers
    connectedDrivers.forEach((driver, driverSocketId) => {
      if (driverSocketId !== socket.id) {
        io.to(driverSocketId).emit('ride:taken', {
          rideId: data.rideId
        });
      }
    });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);

    // Check if it was a driver
    if (connectedDrivers.has(socket.id)) {
      const driver = connectedDrivers.get(socket.id);
      
      // Update Firebase if available
      if (db && driver.driverId) {
        try {
          await db.collection('drivers').doc(driver.driverId).update({
            status: 'offline',
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating driver offline status:', error);
        }
      }

      connectedDrivers.delete(socket.id);

      // Notify customers
      io.emit('drivers:update', {
        onlineCount: connectedDrivers.size,
        drivers: Array.from(connectedDrivers.values())
      });
    }

    // Check if it was a customer
    if (connectedCustomers.has(socket.id)) {
      connectedCustomers.delete(socket.id);
    }
  });
});

// Helper function to calculate fare
function calculateFare(distanceKm) {
  const baseFare = 500; // ¥500 base
  const perKm = 300; // ¥300 per km
  return baseFare + (distanceKm * perKm);
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚕 Tokyo Taxi Backend running on port ${PORT}`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`🔥 Firebase: ${db ? 'connected' : 'not connected'}`);
  console.log(`🌦️ Weather API: ${WEATHER_API_KEY === 'YOUR_API_KEY_HERE' ? 'Not configured' : 'Configured'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
