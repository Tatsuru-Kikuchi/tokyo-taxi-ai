const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

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

// Initialize Firebase Admin
try {
  const serviceAccount = require('./serviceAccountKey.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// ============================================
// COMMENT OUT WEATHER SERVICE FOR NOW
// ============================================
// const WeatherService = require('./src/services/WeatherService');
// const weatherService = new WeatherService();

// We'll add weather monitoring later
console.log('🌧️ Weather monitoring disabled for initial testing');

// ============================================
// SOCKET.IO REAL-TIME CONNECTIONS
// ============================================
const activeDrivers = new Map();
const activeCustomers = new Map();

io.on('connection', (socket) => {
  console.log('✅ New connection:', socket.id);

  // Driver comes online
  socket.on('driver-online', async (driverId) => {
    activeDrivers.set(driverId, socket.id);
    socket.join('drivers');

    try {
      await db.collection('drivers').doc(driverId).set({
        status: 'online',
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        socketId: socket.id
      }, { merge: true });

      console.log(`🚕 Driver ${driverId} is online`);
      socket.emit('status', { online: true });
    } catch (error) {
      console.error('Error updating driver status:', error);
    }
  });

  // Customer connects
  socket.on('customer-connect', (customerId) => {
    activeCustomers.set(customerId, socket.id);
    socket.join('customers');
    console.log(`👤 Customer ${customerId} connected`);
    socket.emit('status', { connected: true });
  });

  // Handle ride requests
  socket.on('request-ride', async (data) => {
    const { customerId, pickup, dropoff } = data;
    console.log(`🚖 New ride request from ${customerId}`);

    try {
      // Create ride request in Firestore
      const rideRef = await db.collection('rides').add({
        customerId,
        pickup,
        dropoff,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`📝 Ride created with ID: ${rideRef.id}`);

      // Notify all online drivers
      io.to('drivers').emit('new-ride-request', {
        rideId: rideRef.id,
        pickup,
        dropoff
      });

      socket.emit('ride-created', {
        rideId: rideRef.id,
        status: 'pending'
      });
    } catch (error) {
      console.error('Error creating ride:', error);
      socket.emit('error', { message: 'Failed to create ride request' });
    }
  });

  // Driver accepts ride
  socket.on('accept-ride', async (data) => {
    const { driverId, rideId } = data;
    console.log(`✅ Driver ${driverId} accepted ride ${rideId}`);

    try {
      // Update ride status
      await db.collection('rides').doc(rideId).update({
        driverId,
        status: 'accepted',
        acceptedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Get ride details
      const ride = await db.collection('rides').doc(rideId).get();
      const rideData = ride.data();

      // Notify customer
      const customerSocket = activeCustomers.get(rideData.customerId);
      if (customerSocket) {
        io.to(customerSocket).emit('ride-accepted', {
          rideId,
          driverId
        });
      }

      socket.emit('ride-accepted-success', { rideId });
    } catch (error) {
      console.error('Error accepting ride:', error);
      socket.emit('error', { message: 'Failed to accept ride' });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);

    // Clean up driver connections
    activeDrivers.forEach((socketId, driverId) => {
      if (socketId === socket.id) {
        activeDrivers.delete(driverId);
        db.collection('drivers').doc(driverId).update({
          status: 'offline',
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        }).catch(console.error);
      }
    });

    // Clean up customer connections
    activeCustomers.forEach((socketId, customerId) => {
      if (socketId === socket.id) {
        activeCustomers.delete(customerId);
      }
    });
  });
});

// ============================================
// REST API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Tokyo AI Taxi Backend is running',
    timestamp: new Date(),
    connections: {
      drivers: activeDrivers.size,
      customers: activeCustomers.size
    }
  });
});

// Get all online drivers
app.get('/api/drivers/online', async (req, res) => {
  try {
    const snapshot = await db.collection('drivers')
      .where('status', '==', 'online')
      .get();

    const drivers = [];
    snapshot.forEach(doc => {
      drivers.push({ id: doc.id, ...doc.data() });
    });

    res.json({ drivers, count: drivers.length });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get all rides
app.get('/api/rides', async (req, res) => {
  try {
    const snapshot = await db.collection('rides')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const rides = [];
    snapshot.forEach(doc => {
      rides.push({ id: doc.id, ...doc.data() });
    });

    res.json({ rides, count: rides.length });
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// Simple weather endpoint (mock for now)
app.get('/api/weather/forecast', (req, res) => {
  res.json({
    current: 'Cloudy',
    rainIn30Minutes: false,
    temperature: 22,
    humidity: 65,
    forecast: [
      { time: '12:00', condition: 'Cloudy', rainProbability: 20 },
      { time: '15:00', condition: 'Rain', rainProbability: 80 },
      { time: '18:00', condition: 'Clear', rainProbability: 10 }
    ]
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Tokyo AI Taxi Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔥 Firebase Firestore connected`);
  console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
  console.log(`📱 WebSocket: ws://localhost:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/drivers/online`);
  console.log(`  GET  /api/rides`);
  console.log(`  GET  /api/weather/forecast`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
