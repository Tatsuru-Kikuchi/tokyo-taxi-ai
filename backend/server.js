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
    version: '2.0.0',
    endpoints: ['/api/health', '/api/weather/forecast', '/api/drivers/online', '/api/rides']
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Tokyo Taxi Backend Running',
    firebase: admin.apps.length > 0 ? 'connected' : 'not connected',
    timestamp: new Date().toISOString(),
    connectedDrivers: connectedDrivers.size,
    connectedCustomers: connectedCustomers.size
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

// Get online drivers with locations
app.get('/api/drivers/online', async (req, res) => {
  const drivers = Array.from(connectedDrivers.values()).filter(d => d.status === 'online');

  res.json({
    count: drivers.length,
    drivers: drivers.map(d => ({
      id: d.socketId,
      name: d.name,
      location: d.location,
      status: d.status
    }))
  });
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

// WebSocket handling with location support
const connectedDrivers = new Map();
const connectedCustomers = new Map();
const activeRides = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Driver connects with location
  socket.on('driver:connect', async (driverData) => {
    console.log('Driver connected:', driverData);

    const driverInfo = {
      ...driverData,
      socketId: socket.id,
      status: 'online',
      location: driverData.location || null,
      lastSeen: new Date()
    };

    connectedDrivers.set(socket.id, driverInfo);

    // Update driver status in Firebase if available
    if (db && driverData.driverId) {
      try {
        await db.collection('drivers').doc(driverData.driverId).set({
          ...driverInfo,
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating driver status:', error);
      }
    }

    // Notify all clients of driver update
    io.emit('drivers:update', {
      onlineCount: connectedDrivers.size,
      drivers: Array.from(connectedDrivers.values()).map(d => ({
        id: d.socketId,
        location: d.location,
        status: d.status
      }))
    });

    socket.emit('driver:connected', {
      message: 'ドライバーとして接続されました',
      driverId: driverData.driverId || socket.id
    });

    // Send nearby customers to driver
    const waitingCustomers = Array.from(connectedCustomers.values())
      .filter(c => c.status === 'waiting' && c.location)
      .map(c => ({
        location: c.location,
        customerId: c.customerId
      }));

    if (waitingCustomers.length > 0) {
      socket.emit('customer:nearby', waitingCustomers);
    }
  });

  // Driver location update
  socket.on('driver:location', (location) => {
    console.log('Driver location update:', socket.id, location);

    if (connectedDrivers.has(socket.id)) {
      const driver = connectedDrivers.get(socket.id);
      driver.location = location;
      driver.lastSeen = new Date();
      connectedDrivers.set(socket.id, driver);

      // If driver has active ride, update customer
      const activeRide = Array.from(activeRides.values())
        .find(ride => ride.driverId === socket.id);

      if (activeRide) {
        // Send driver location to specific customer
        io.to(activeRide.customerSocketId).emit('driver:location', {
          driverId: socket.id,
          location: location,
          eta: calculateETA(location, activeRide.pickupCoords)
        });
      }

      // Broadcast to all customers for nearby drivers display
      connectedCustomers.forEach((customer, customerSocketId) => {
        if (customer.location) {
          const distance = calculateDistance(location, customer.location);
          if (distance < 5) { // Within 5km
            io.to(customerSocketId).emit('driver:nearby', {
              driverId: socket.id,
              location: location,
              distance: distance
            });
          }
        }
      });
    }
  });

  // Customer connects with location
  socket.on('customer:connect', (customerData) => {
    console.log('Customer connected:', customerData);

    const customerInfo = {
      ...customerData,
      socketId: socket.id,
      location: customerData.location || null,
      status: 'idle'
    };

    connectedCustomers.set(socket.id, customerInfo);

    // Send available drivers count
    const onlineDrivers = Array.from(connectedDrivers.values())
      .filter(d => d.status === 'online').length;

    socket.emit('customer:connected', {
      message: 'お客様として接続されました',
      customerId: customerData.customerId || socket.id,
      onlineDrivers: onlineDrivers
    });

    // Send nearby drivers
    const nearbyDrivers = Array.from(connectedDrivers.values())
      .filter(d => d.status === 'online' && d.location)
      .map(d => ({
        driverId: d.socketId,
        location: d.location
      }));

    if (nearbyDrivers.length > 0) {
      socket.emit('drivers:nearby', nearbyDrivers);
    }
  });

  // Customer location update
  socket.on('customer:location', (location) => {
    if (connectedCustomers.has(socket.id)) {
      const customer = connectedCustomers.get(socket.id);
      customer.location = location;
      connectedCustomers.set(socket.id, customer);
    }
  });

  // Customer requests ride with location data
  socket.on('ride:request', async (rideData) => {
    console.log('Ride requested with location:', rideData);

    // Update customer status
    if (connectedCustomers.has(socket.id)) {
      const customer = connectedCustomers.get(socket.id);
      customer.status = 'waiting';
      connectedCustomers.set(socket.id, customer);
    }

    let rideId = 'ride_' + Date.now();

    // Enhanced ride data with coordinates
    const enhancedRideData = {
      ...rideData,
      rideId,
      customerSocketId: socket.id,
      status: 'pending',
      createdAt: new Date(),
      estimatedFare: calculateFare(
        rideData.pickupCoords && rideData.destinationCoords
          ? calculateDistance(rideData.pickupCoords, rideData.destinationCoords)
          : 5
      )
    };

    // Store in active rides
    activeRides.set(rideId, enhancedRideData);

    // Save to Firebase if available
    if (db) {
      try {
        const rideRef = await db.collection('rides').add({
          ...enhancedRideData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        rideId = rideRef.id;
        enhancedRideData.rideId = rideId;
        activeRides.set(rideId, enhancedRideData);
      } catch (error) {
        console.error('Error creating ride in Firebase:', error);
      }
    }

    // Notify nearby drivers with location context
    connectedDrivers.forEach((driver, driverSocketId) => {
      if (driver.status === 'online') {
        let distance = null;
        if (driver.location && rideData.pickupCoords) {
          distance = calculateDistance(driver.location, rideData.pickupCoords);
        }

        io.to(driverSocketId).emit('ride:new', {
          ...enhancedRideData,
          distanceToPickup: distance
        });
      }
    });

    // Confirm to customer
    socket.emit('ride:requested', {
      rideId,
      message: '配車リクエストを近くのドライバーに送信しました',
      status: 'pending'
    });
  });

  // Driver accepts ride with location
  socket.on('ride:accept', async (data) => {
    console.log('Driver accepting ride:', data);

    const ride = activeRides.get(data.rideId);
    if (!ride) {
      socket.emit('ride:error', { message: 'Ride not found' });
      return;
    }

    // Update ride status
    ride.status = 'accepted';
    ride.driverId = socket.id;
    ride.driverLocation = data.driverLocation;
    activeRides.set(data.rideId, ride);

    // Update in Firebase
    if (db) {
      try {
        await db.collection('rides').doc(data.rideId).update({
          status: 'accepted',
          driverId: socket.id,
          driverLocation: data.driverLocation,
          acceptedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error accepting ride:', error);
      }
    }

    // Notify customer with driver location
    io.to(ride.customerSocketId).emit('ride:accepted', {
      rideId: data.rideId,
      driverId: socket.id,
      driverLocation: data.driverLocation,
      message: 'ドライバーが配車を承諾しました！',
      estimatedArrival: calculateETA(data.driverLocation, ride.pickupCoords)
    });

    // Confirm to driver
    socket.emit('ride:accept:success', {
      rideId: data.rideId,
      message: '配車を承諾しました',
      customer: {
        pickup: ride.pickup,
        destination: ride.destination,
        pickupCoords: ride.pickupCoords,
        destinationCoords: ride.destinationCoords
      }
    });

    // Notify other drivers that ride is taken
    connectedDrivers.forEach((driver, driverSocketId) => {
      if (driverSocketId !== socket.id) {
        io.to(driverSocketId).emit('ride:taken', {
          rideId: data.rideId
        });
      }
    });
  });

  // Ride completion
  socket.on('ride:complete', async (data) => {
    console.log('Ride completed:', data);

    const ride = activeRides.get(data.rideId);
    if (ride) {
      // Update Firebase
      if (db) {
        try {
          await db.collection('rides').doc(data.rideId).update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            finalFare: data.fare || ride.estimatedFare
          });
        } catch (error) {
          console.error('Error completing ride:', error);
        }
      }

      // Notify customer
      io.to(ride.customerSocketId).emit('ride:completed', {
        rideId: data.rideId,
        message: '配車が完了しました',
        fare: data.fare || ride.estimatedFare
      });

      // Remove from active rides
      activeRides.delete(data.rideId);

      // Update customer status
      if (connectedCustomers.has(ride.customerSocketId)) {
        const customer = connectedCustomers.get(ride.customerSocketId);
        customer.status = 'idle';
        connectedCustomers.set(ride.customerSocketId, customer);
      }
    }
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

      // Notify all clients
      io.emit('drivers:update', {
        onlineCount: connectedDrivers.size,
        drivers: Array.from(connectedDrivers.values()).map(d => ({
          id: d.socketId,
          location: d.location,
          status: d.status
        }))
      });
    }

    // Check if it was a customer
    if (connectedCustomers.has(socket.id)) {
      connectedCustomers.delete(socket.id);
    }
  });
});

// Helper functions
function calculateDistance(coord1, coord2) {
  if (!coord1 || !coord2) return null;

  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

function calculateFare(distanceKm) {
  const baseFare = 500; // ¥500 base
  const perKm = 300; // ¥300 per km
  return Math.round(baseFare + (distanceKm * perKm));
}

function calculateETA(driverLocation, customerLocation) {
  if (!driverLocation || !customerLocation) return '計算中...';

  const distance = calculateDistance(driverLocation, customerLocation);
  const avgSpeedKmh = 30; // Average speed in Tokyo
  const timeInMinutes = Math.round((distance / avgSpeedKmh) * 60);

  return `約${timeInMinutes}分`;
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
  console.log(`📍 Location tracking: Enabled`);
});

module.exports = app;
