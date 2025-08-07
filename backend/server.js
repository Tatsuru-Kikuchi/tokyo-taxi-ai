require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY_HERE';
const TOKYO_LAT = 35.6762;
const TOKYO_LON = 139.6503;

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tokyo Taxi Backend Running' });
});

// Weather forecast endpoint
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
    message: 'Rain expected at 17:00! High demand period coming.'
  };
  res.json(mockForecast);
});

// Get online drivers
app.get('/api/drivers/online', async (req, res) => {
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

    // Update driver status in Firebase
    if (driverData.driverId) {
      await db.collection('drivers').doc(driverData.driverId).set({
        ...driverData,
        status: 'online',
        lastSeen: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Notify customers of new driver
    io.emit('drivers:update', {
      onlineCount: connectedDrivers.size,
      drivers: Array.from(connectedDrivers.values())
    });

    socket.emit('driver:connected', {
      message: 'Successfully connected as driver',
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
      message: 'Successfully connected as customer',
      customerId: customerData.customerId || socket.id,
      onlineDrivers: connectedDrivers.size
    });
  });

  // Customer requests ride
  socket.on('ride:request', async (rideData) => {
    console.log('Ride requested:', rideData);

    try {
      // Create ride in Firebase
      const rideRef = await db.collection('rides').add({
        ...rideData,
        status: 'pending',
        customerId: rideData.customerId || socket.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const rideId = rideRef.id;
      console.log('Ride created in Firebase:', rideId);

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
        message: 'Your ride request has been sent to nearby drivers',
        status: 'pending'
      });

    } catch (error) {
      console.error('Error creating ride:', error);
      socket.emit('ride:error', {
        message: 'Failed to create ride request'
      });
    }
  });

  // Driver accepts ride
  socket.on('ride:accept', async (data) => {
    console.log('Driver accepting ride:', data);

    try {
      // Update ride in Firebase
      await db.collection('rides').doc(data.rideId).update({
        status: 'accepted',
        driverId: data.driverId || socket.id,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Get ride details
      const rideDoc = await db.collection('rides').doc(data.rideId).get();
      const rideData = rideDoc.data();

      // Notify customer
      connectedCustomers.forEach((customer, customerSocketId) => {
        if (customer.customerId === rideData.customerId || customerSocketId === rideData.customerId) {
          io.to(customerSocketId).emit('ride:accepted', {
            rideId: data.rideId,
            driverId: data.driverId,
            message: 'A driver has accepted your ride!',
            estimatedArrival: '5 minutes'
          });
        }
      });

      // Confirm to driver
      socket.emit('ride:accept:success', {
        rideId: data.rideId,
        message: 'You have accepted the ride',
        customer: rideData
      });

    } catch (error) {
      console.error('Error accepting ride:', error);
      socket.emit('ride:error', {
        message: 'Failed to accept ride'
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);

    // Check if it was a driver
    if (connectedDrivers.has(socket.id)) {
      const driver = connectedDrivers.get(socket.id);
      
      // Update Firebase
      if (driver.driverId) {
        await db.collection('drivers').doc(driver.driverId).update({
          status: 'offline',
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        });
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

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚕 Tokyo Taxi Backend running on port ${PORT}`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`🔥 Firebase connected`);
  console.log(`🌦️ Weather API: ${WEATHER_API_KEY === 'YOUR_API_KEY_HERE' ? 'Not configured' : 'Configured'}`);
});

module.exports = app;