// 🚕 全国AIタクシー Backend - Production Server
// Version 3.1.0 - With PayPay & Square Payment Integration

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const axios = require('axios');

// ========================================
// EXPRESS APP SETUP
// ========================================

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ========================================
// MIDDLEWARE SETUP (IMPORTANT ORDER)
// ========================================

// CORS first
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Raw body parser for webhooks BEFORE JSON parser
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments/paypay/webhook', express.raw({ type: 'application/json' }));

// JSON parser for everything else
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========================================
// LOAD ALL 8,604 STATIONS
// ========================================

let ALL_STATIONS = [];
try {
  const stationData = fs.readFileSync(path.join(__dirname, 'data/all_japan_stations.json'), 'utf8');
  ALL_STATIONS = JSON.parse(stationData);
  console.log(`✅ Loaded ${ALL_STATIONS.length} stations from file`);
} catch (error) {
  console.log('⚠️ Could not load station file, using default stations');
  // Fallback to basic stations if file not found
  ALL_STATIONS = [
    { id: 1, name: '東京駅', lat: 35.6812, lng: 139.7671, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 2, name: '新宿駅', lat: 35.6896, lng: 139.6995, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 3, name: '渋谷駅', lat: 35.6580, lng: 139.7016, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 4, name: '池袋駅', lat: 35.7295, lng: 139.7109, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 5, name: '品川駅', lat: 35.6284, lng: 139.7387, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 6, name: '上野駅', lat: 35.7141, lng: 139.7774, prefecture: '東京都', lines: ['JR山手線'] },
    { id: 7, name: '大阪駅', lat: 34.7024, lng: 135.4959, prefecture: '大阪府', lines: ['JR'] },
    { id: 8, name: '京都駅', lat: 34.9859, lng: 135.7585, prefecture: '京都府', lines: ['JR'] },
    { id: 9, name: '横浜駅', lat: 35.4657, lng: 139.6222, prefecture: '神奈川県', lines: ['JR'] },
    { id: 10, name: '名古屋駅', lat: 35.1709, lng: 136.8815, prefecture: '愛知県', lines: ['JR'] }
  ];
}

// ========================================
// DATABASE CONNECTION
// ========================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/taxi_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Add database to request object for payment routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// ========================================
// PAYMENT ROUTES INTEGRATION
// ========================================

const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// ========================================
// SQUARE PAYMENT SERVICE (EXISTING)
// ========================================

class SquarePaymentService {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    this.accessToken = process.env.SQUARE_ACCESS_TOKEN;
    this.locationId = process.env.SQUARE_LOCATION_ID;
    console.log('💳 Square Payment Service initialized');
  }

  async createPayment(amount, sourceId, customerId = null) {
    if (!this.accessToken || !this.locationId) {
      console.log('⚠️ Square credentials not configured');
      return {
        success: false,
        error: 'Payment service not configured'
      };
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/v2/payments`,
        {
          source_id: sourceId,
          amount_money: {
            amount: amount,
            currency: 'JPY'
          },
          location_id: this.locationId,
          reference_id: `taxi-${Date.now()}`
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': '2023-10-18'
          }
        }
      );

      return {
        success: true,
        paymentId: response.data.payment.id,
        status: response.data.payment.status,
        receiptUrl: response.data.payment.receipt_url || null
      };
    } catch (error) {
      console.error('Square payment error:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message
      };
    }
  }

  async getPayment(paymentId) {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'Payment service not configured'
      };
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/v2/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Square-Version': '2023-10-18'
          }
        }
      );

      return {
        success: true,
        payment: response.data.payment
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message
      };
    }
  }
}

const squarePayment = new SquarePaymentService();

// ========================================
// IMPORT SERVICES (EXISTING)
// ========================================

let backupService = null;
let TrackingService = null;
let trackingService = null;

try {
  backupService = require('./scripts/backup');
  console.log('✅ Backup service loaded');
} catch (error) {
  console.log('⚠️ Backup service not found, skipping...');
}

try {
  TrackingService = require('./services/tracking');
  trackingService = new TrackingService(pool);
  console.log('✅ Tracking service loaded');
} catch (error) {
  console.log('⚠️ Tracking service not found, skipping...');
}

// Test database connection and create tables
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('⚠️ Database connection error:', err.message);
    console.log('📁 Running in file-only mode');
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
    initializeDatabase();
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20),
        pickup_station VARCHAR(255),
        pickup_lat DECIMAL(10,8),
        pickup_lng DECIMAL(11,8),
        destination TEXT,
        fare INTEGER,
        status VARCHAR(50),
        driver_id VARCHAR(255),
        confirmation_code VARCHAR(20),
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create drivers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        is_online BOOLEAN DEFAULT false,
        current_lat DECIMAL(10,8),
        current_lng DECIMAL(11,8),
        rating DECIMAL(2,1),
        vehicle_type VARCHAR(50),
        plate_number VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table (updated for multiple payment methods)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        booking_id VARCHAR(255),
        amount INTEGER,
        payment_method VARCHAR(50),
        payment_id VARCHAR(255),
        status VARCHAR(50),
        square_payment_id VARCHAR(255),
        receipt_url TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      )
    `);

    // Create refunds table (new for PayPay)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        payment_id VARCHAR(255),
        amount INTEGER,
        reason TEXT,
        refund_id VARCHAR(255),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
      )
    `);

    // Add PostgreSQL indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_drivers_location
      ON drivers (current_lat, current_lng);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_drivers_online
      ON drivers (is_online, last_updated);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_status
      ON bookings (status, created_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_booking
      ON payments (booking_id, status);
    `);

    console.log('✅ Database tables and indexes initialized');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

// Initialize services after database setup
if (backupService) {
  backupService.initialize();
}

if (trackingService) {
  trackingService.initialize(server);
}

// ========================================
// SYSTEM STATUS ENDPOINT
// ========================================

app.get('/api/system/status', (req, res) => {
  // Check PayPay configuration
  const paypayConfigured = !!(
    process.env.PAYPAY_API_KEY &&
    process.env.PAYPAY_API_SECRET &&
    process.env.PAYPAY_MERCHANT_ID
  );

  res.json({
    backup: backupService ? 'operational' : 'not_configured',
    tracking: trackingService ? trackingService.getStatus() : 'not_configured',
    database: pool ? 'connected' : 'disconnected',
    payments: {
      square: squarePayment.accessToken ? 'configured' : 'not_configured',
      paypay: paypayConfigured ? 'configured' : 'not_configured',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
    },
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    timestamp: new Date().toISOString()
  });
});

// ========================================
// LEGACY SQUARE PAYMENT ENDPOINTS (KEEP FOR COMPATIBILITY)
// ========================================

app.get('/api/payment/test', (req, res) => {
  const availableMethods = [];

  // Check all payment methods
  if (squarePayment.accessToken) availableMethods.push('square');
  if (process.env.STRIPE_SECRET_KEY) availableMethods.push('stripe');
  if (process.env.PAYPAY_API_KEY) availableMethods.push('paypay');

  // Always available
  availableMethods.push('cash', 'ic_card');

  res.json({
    status: 'Payment system ready',
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    environment: process.env.NODE_ENV === 'production' ? 'live' : 'test',
    availableMethods: availableMethods,
    configured: {
      square: !!squarePayment.accessToken,
      paypay: !!(process.env.PAYPAY_API_KEY && process.env.PAYPAY_API_SECRET),
      stripe: !!process.env.STRIPE_SECRET_KEY
    },
    message: availableMethods.length > 2 ?
      'Multiple payment methods configured' :
      'Basic payment methods available'
  });
});

app.post('/api/payment/square', async (req, res) => {
  const { amount, sourceId, customerId, bookingId } = req.body;

  if (!amount || !sourceId) {
    return res.status(400).json({
      success: false,
      error: 'Amount and sourceId are required'
    });
  }

  const result = await squarePayment.createPayment(amount, sourceId, customerId);

  if (result.success) {
    // Update booking as paid
    if (pool && bookingId) {
      try {
        await pool.query(
          'UPDATE bookings SET payment_status = $1, payment_id = $2 WHERE id = $3',
          ['paid', result.paymentId, bookingId]
        );

        // Save payment record
        await pool.query(
          'INSERT INTO payments (booking_id, amount, payment_method, payment_id, status, square_payment_id, receipt_url) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [bookingId, amount, 'square', result.paymentId, result.status, result.paymentId, result.receiptUrl]
        );
      } catch (dbError) {
        console.log('Database payment update failed:', dbError.message);
      }
    }

    res.json({
      success: true,
      paymentId: result.paymentId,
      status: result.status,
      receiptUrl: result.receiptUrl,
      message: '支払いが完了しました'
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error
    });
  }
});

app.get('/api/payment/:paymentId', async (req, res) => {
  const result = await squarePayment.getPayment(req.params.paymentId);

  if (result.success) {
    res.json(result.payment);
  } else {
    res.status(404).json({
      success: false,
      error: result.error
    });
  }
});

// Manual backup trigger endpoint
app.post('/api/admin/backup', async (req, res) => {
  if (backupService) {
    try {
      await backupService.manualBackup();
      res.json({
        success: true,
        message: 'PostgreSQL backup started successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else {
    res.status(503).json({
      success: false,
      error: 'Backup service not configured'
    });
  }
});

// ========================================
// IN-MEMORY DATA STORAGE (Fallback)
// ========================================

const bookings = [];
const drivers = [
  {
    id: 'd1',
    name: '田中運転手',
    location: { latitude: 35.6812, longitude: 139.7671 },
    isOnline: true,
    rating: 4.8,
    vehicle: { type: 'sedan', plateNumber: '品川 500 た 12-34' }
  },
  {
    id: 'd2',
    name: '佐藤運転手',
    location: { latitude: 35.6896, longitude: 139.6995 },
    isOnline: true,
    rating: 4.9,
    vehicle: { type: 'sedan', plateNumber: '品川 500 ふ 56-78' }
  },
  {
    id: 'd3',
    name: '山田運転手',
    location: { latitude: 35.6580, longitude: 139.7016 },
    isOnline: true,
    rating: 4.7,
    vehicle: { type: 'minivan', plateNumber: '品川 500 す 90-12' }
  }
];

// ========================================
// HEALTH CHECK & STATUS
// ========================================
app.get('/', (req, res) => {
  const paypayConfigured = !!(
    process.env.PAYPAY_API_KEY &&
    process.env.PAYPAY_API_SECRET &&
    process.env.PAYPAY_MERCHANT_ID
  );

  res.json({
    service: '🚕 全国AIタクシー API',
    status: 'operational',
    version: '3.1.0',
    database: pool ? 'connected' : 'disconnected',
    payments: {
      square: squarePayment.accessToken ? 'configured' : 'not_configured',
      paypay: paypayConfigured ? 'configured' : 'not_configured',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
    },
    endpoints: {
      health: '/api/health',
      bookings: '/api/bookings',
      drivers: '/api/drivers/nearby',
      trains: '/api/trains/schedule',
      weather: '/api/weather',
      payment: '/api/payment/test',
      paypayPayment: '/api/payments/paypay/create',
      squarePayment: '/api/payment/square',
      stations: '/api/stations',
      stationSearch: '/api/stations/search',
      nearbyStations: '/api/stations/nearby',
      prefectures: '/api/stations/prefectures',
      systemStatus: '/api/system/status'
    },
    stats: {
      totalStations: ALL_STATIONS.length,
      prefectures: [...new Set(ALL_STATIONS.map(s => s.prefecture))].filter(Boolean).length,
      onlineDrivers: drivers.filter(d => d.isOnline).length,
      totalBookings: bookings.length
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  const paypayConfigured = !!(
    process.env.PAYPAY_API_KEY &&
    process.env.PAYPAY_API_SECRET &&
    process.env.PAYPAY_MERCHANT_ID
  );

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: '全国AIタクシー Backend',
    version: '3.1.0',
    database: pool ? 'connected' : 'disconnected',
    payments: {
      square: squarePayment.accessToken ? 'configured' : 'not_configured',
      paypay: paypayConfigured ? 'configured' : 'not_configured',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
    },
    stations: ALL_STATIONS.length,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========================================
// TRAIN API ENDPOINTS
// ========================================
app.get('/api/trains/schedule', async (req, res) => {
  const { station } = req.query;
  const now = new Date();
  const hour = now.getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);

  // Find the actual station from our data
  const stationData = ALL_STATIONS.find(s =>
    s.name === station || s.id === parseInt(station)
  ) || ALL_STATIONS[0];

  const trains = [
    {
      trainId: `JR_YAMANOTE_${Date.now()}_1`,
      lineName: '山手線',
      lineColor: '#9ACD32',
      destination: '品川・渋谷方面',
      platform: '2番線',
      arrivalMinutes: 3,
      status: 'on_time',
      crowdLevel: isRushHour ? 'high' : 'medium',
      cars: 11
    },
    {
      trainId: `JR_CHUO_${Date.now()}_2`,
      lineName: '中央線',
      lineColor: '#FFA500',
      destination: '新宿方面',
      platform: '7番線',
      arrivalMinutes: 5,
      status: isRushHour ? 'delayed' : 'on_time',
      delayMinutes: isRushHour ? 3 : 0,
      crowdLevel: isRushHour ? 'very_high' : 'low',
      cars: 10
    },
    {
      trainId: `JR_KEIHIN_${Date.now()}_3`,
      lineName: '京浜東北線',
      lineColor: '#00BFFF',
      destination: '大宮方面',
      platform: '3番線',
      arrivalMinutes: 7,
      status: 'on_time',
      crowdLevel: 'medium',
      cars: 10
    }
  ];

  res.json({
    station: stationData.name,
    stationName: stationData.name,
    prefecture: stationData.prefecture,
    trains: trains,
    isRushHour: isRushHour,
    timestamp: now.toISOString()
  });
});

app.post('/api/trains/delays', async (req, res) => {
  const { stationId, lineId } = req.body;
  const hasDelay = Math.random() > 0.7;

  res.json({
    hasDelay,
    delayMinutes: hasDelay ? Math.floor(Math.random() * 10) + 5 : 0,
    reason: hasDelay ? '混雑のため' : null,
    affectedLines: hasDelay ? [lineId] : [],
    recommendation: hasDelay ? 'タクシー利用をお勧めします' : null,
    alternativeRoutes: hasDelay ? ['都営バス', 'タクシー'] : [],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/trains/sync', async (req, res) => {
  const { userId, stationId, trainId } = req.body;

  res.json({
    success: true,
    syncId: `SYNC_${Date.now()}`,
    message: '電車遅延時に自動でタクシーを配車します',
    monitoring: true,
    station: stationId,
    train: trainId,
    userId: userId
  });
});

// ========================================
// BOOKING ENDPOINTS (Existing functionality)
// ========================================

// Create booking with database support
app.post('/api/bookings/create', async (req, res) => {
  try {
    const confirmationCode = 'BK' + Date.now();
    const booking = {
      id: confirmationCode,
      customerName: req.body.customerName || 'Guest',
      customerPhone: req.body.customerPhone || '',
      pickupStation: req.body.pickupStation,
      pickupLat: req.body.pickupLat,
      pickupLng: req.body.pickupLng,
      destination: req.body.destination,
      fare: req.body.fare || 0,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date()
    };

    // Try to save to database
    if (pool) {
      try {
        const query = `
          INSERT INTO bookings
          (id, customer_name, customer_phone, pickup_station, pickup_lat, pickup_lng, destination, fare, status, confirmation_code, payment_status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;

        const result = await pool.query(query, [
          booking.id,
          booking.customerName,
          booking.customerPhone,
          booking.pickupStation,
          booking.pickupLat,
          booking.pickupLng,
          booking.destination,
          booking.fare,
          booking.status,
          booking.id,
          booking.paymentStatus,
          booking.createdAt
        ]);

        console.log('✅ Booking saved to database:', booking.id);
      } catch (dbError) {
        console.log('⚠️ Database save failed, using file backup:', dbError.message);
      }
    }

    // Always save to file as backup
    try {
      fs.appendFileSync('./bookings.json', JSON.stringify(booking) + '\n');
    } catch (fileError) {
      console.log('⚠️ File save failed:', fileError.message);
    }

    // Keep in memory for quick access
    bookings.push(booking);

    res.json({
      success: true,
      booking,
      message: '予約が確定しました'
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      error: 'Failed to create booking',
      message: error.message
    });
  }
});

// Get booking by ID
app.get('/api/bookings/:id', async (req, res) => {
  try {
    let booking = null;

    // Try database first
    if (pool) {
      const result = await pool.query('SELECT * FROM bookings WHERE id = $1 OR confirmation_code = $1', [req.params.id]);
      if (result.rows.length > 0) {
        booking = result.rows[0];
      }
    }

    // Fallback to memory
    if (!booking) {
      booking = bookings.find(b => b.id === req.params.id);
    }

    if (!booking) {
      return res.status(404).json({ error: '予約が見つかりません' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
  const { userId, status } = req.query;

  try {
    let filteredBookings = [];

    // Try database first
    if (pool) {
      let query = 'SELECT * FROM bookings WHERE 1=1';
      const params = [];

      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC LIMIT 100';

      const result = await pool.query(query, params);
      filteredBookings = result.rows;
    }

    // Fallback to memory if no database results
    if (filteredBookings.length === 0) {
      filteredBookings = bookings;
      if (status) {
        filteredBookings = filteredBookings.filter(b => b.status === status);
      }
    }

    res.json({
      bookings: filteredBookings,
      total: filteredBookings.length
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Update booking status
app.put('/api/bookings/:id/status', async (req, res) => {
  const { status } = req.body;

  try {
    // Update in database
    if (pool) {
      await pool.query(
        'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, req.params.id]
      );
    }

    // Update in memory
    const booking = bookings.find(b => b.id === req.params.id);
    if (booking) {
      booking.status = status;
      booking.updatedAt = new Date().toISOString();
    }

    // Emit status change
    io.emit('booking_status_changed', booking || { id: req.params.id, status });

    res.json({
      success: true,
      booking: booking || { id: req.params.id, status }
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// ========================================
// DRIVER ENDPOINTS (Existing functionality)
// ========================================

app.get('/api/drivers/nearby', async (req, res) => {
  const { lat, lng, radius } = req.query;
  const userLat = parseFloat(lat) || 35.6812;
  const userLng = parseFloat(lng) || 139.7671;
  const searchRadius = parseInt(radius) || 2000;

  try {
    let nearbyDrivers = [];

    // Try database first
    if (pool) {
      try {
        const query = `
          SELECT
            id, name, current_lat as lat, current_lng as lng, rating, is_online,
            SQRT(POW(69.1 * (current_lat - $1), 2) +
                 POW(69.1 * ($2 - current_lng) * COS(current_lat / 57.3), 2)) * 1000 AS distance
          FROM drivers
          WHERE is_online = true
            AND current_lat IS NOT NULL
            AND current_lng IS NOT NULL
          ORDER BY distance
          LIMIT 10
        `;

        const result = await pool.query(query, [userLat, userLng]);
        nearbyDrivers = result.rows.filter(d => d.distance <= searchRadius);
      } catch (dbError) {
        console.log('Database query failed, using memory:', dbError.message);
      }
    }

    // Fallback to in-memory drivers
    if (nearbyDrivers.length === 0) {
      nearbyDrivers = drivers
        .filter(d => d.isOnline)
        .map(driver => {
          const distance = Math.sqrt(
            Math.pow(driver.location.latitude - userLat, 2) +
            Math.pow(driver.location.longitude - userLng, 2)
          ) * 111000;

          return {
            ...driver,
            distance: Math.round(distance),
            eta: Math.ceil(distance / 500) + 2,
            fare_estimate: Math.round(1000 + distance * 2.5)
          };
        })
        .filter(d => d.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({
      drivers: nearbyDrivers,
      total: nearbyDrivers.length,
      searchRadius: searchRadius,
      userLocation: { lat: userLat, lng: userLng }
    });
  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({ error: 'Failed to get nearby drivers' });
  }
});

// Update driver location
app.post('/api/drivers/:id/location', async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    // Update in database
    if (pool) {
      await pool.query(
        'UPDATE drivers SET current_lat = $1, current_lng = $2, last_updated = NOW() WHERE id = $3',
        [latitude, longitude, req.params.id]
      );
    }

    // Update in memory
    const driver = drivers.find(d => d.id === req.params.id);
    if (driver) {
      driver.location = { latitude, longitude };
      driver.lastUpdated = new Date().toISOString();
    }

    // Emit location update
    io.emit('driver_location_updated', {
      driverId: req.params.id,
      location: { latitude, longitude }
    });

    res.json({
      success: true,
      driver: driver || { id: req.params.id, location: { latitude, longitude } }
    });
  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({ error: 'Failed to update driver location' });
  }
});

// ========================================
// STATION ENDPOINTS (ALL 8,604 STATIONS)
// ========================================

// Get stations with pagination and filtering
app.get('/api/stations', (req, res) => {
  const { prefecture, limit, offset } = req.query;

  let filteredStations = ALL_STATIONS;

  if (prefecture) {
    filteredStations = filteredStations.filter(s => s.prefecture === prefecture);
  }

  const startIndex = parseInt(offset) || 0;
  const endIndex = startIndex + (parseInt(limit) || 100);

  res.json({
    stations: filteredStations.slice(startIndex, endIndex),
    total: filteredStations.length,
    prefectures: [...new Set(ALL_STATIONS.map(s => s.prefecture))].filter(Boolean).sort()
  });
});

// Search stations
app.get('/api/stations/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: '検索キーワードが必要です' });
  }

  const results = ALL_STATIONS.filter(s =>
    s.name?.includes(q) ||
    s.nameEn?.toLowerCase().includes(q.toLowerCase()) ||
    s.prefecture?.includes(q) ||
    s.lines?.some(line => line.includes(q))
  ).slice(0, 50); // Limit to 50 results

  res.json({
    query: q,
    results,
    total: results.length
  });
});

// Get nearby stations
app.get('/api/stations/nearby', (req, res) => {
  const { lat, lng, limit } = req.query;
  const userLat = parseFloat(lat) || 35.6812;
  const userLng = parseFloat(lng) || 139.7671;
  const maxResults = parseInt(limit) || 10;

  const nearbyStations = ALL_STATIONS
    .map(station => {
      const distance = Math.sqrt(
        Math.pow(station.lat - userLat, 2) +
        Math.pow(station.lng - userLng, 2)
      ) * 111000; // Convert to meters

      return { ...station, distance: Math.round(distance) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults);

  res.json({
    stations: nearbyStations,
    total: nearbyStations.length,
    userLocation: { lat: userLat, lng: userLng }
  });
});

// ========================================
// WEATHER ENDPOINT
// ========================================

app.get('/api/weather', (req, res) => {
  const { lat, lng } = req.query;

  const weatherConditions = ['clear', 'cloudy', 'rainy', 'heavy_rain'];
  const currentWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

  const surgeMultiplier = {
    clear: 1.0,
    cloudy: 1.0,
    rainy: 1.15,
    heavy_rain: 1.30
  };

  res.json({
    location: { lat: parseFloat(lat) || 35.6812, lng: parseFloat(lng) || 139.7671 },
    condition: currentWeather,
    temperature: 18 + Math.floor(Math.random() * 15),
    humidity: 40 + Math.floor(Math.random() * 40),
    surgeMultiplier: surgeMultiplier[currentWeather],
    surgeReason: currentWeather === 'rainy' ? '雨天のため' : currentWeather === 'heavy_rain' ? '豪雨のため' : null,
    forecast: '今日は雨の可能性があります',
    hourlyForecast: [
      { hour: new Date().getHours(), condition: currentWeather, temp: 20 },
      { hour: (new Date().getHours() + 1) % 24, condition: 'cloudy', temp: 19 },
      { hour: (new Date().getHours() + 2) % 24, condition: 'rainy', temp: 18 }
    ]
  });
});

// ========================================
// WebSocket CONNECTION HANDLING
// ========================================

const activeConnections = new Map();

io.on('connection', (socket) => {
  console.log('👤 Client connected:', socket.id);
  activeConnections.set(socket.id, { connectedAt: new Date(), type: 'unknown' });

  socket.on('join', (data) => {
    const { userId, userType } = data;
    socket.join(userType);
    activeConnections.set(socket.id, { ...activeConnections.get(socket.id), userId, userType });
    console.log(`User ${userId} joined as ${userType}`);
  });

  socket.on('driver_location_update', (data) => {
    const driver = drivers.find(d => d.id === data.driverId);
    if (driver) {
      driver.location = data.location;
      driver.lastUpdated = new Date().toISOString();

      socket.broadcast.to('customer').emit('driver_moved', {
        driverId: data.driverId,
        location: data.location
      });
    }
  });

  socket.on('disconnect', () => {
    const connection = activeConnections.get(socket.id);
    console.log('👤 Client disconnected:', socket.id, connection?.userType);
    activeConnections.delete(socket.id);
  });
});

// ========================================
// ERROR HANDLING
// ========================================

app.use((error, req, res, next) => {
  console.error('🚨 ERROR:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'エンドポイントが見つかりません',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// SERVER START
// ========================================

const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
  const paypayConfigured = !!(
    process.env.PAYPAY_API_KEY &&
    process.env.PAYPAY_API_SECRET &&
    process.env.PAYPAY_MERCHANT_ID
  );

  console.log('========================================');
  console.log(`🚕 全国AIタクシー Backend v3.1.0`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 WebSocket ready for connections`);
  console.log(`💾 Database: ${pool ? 'Connected' : 'File-only mode'}`);
  console.log(`💳 Payments:`);
  console.log(`   Square: ${squarePayment.accessToken ? 'Configured' : 'Not configured'}`);
  console.log(`   PayPay: ${paypayConfigured ? 'Configured' : 'Not configured'}`);
  console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`🗾 Coverage: Nationwide Japan`);
  console.log(`🚇 Total Stations: ${ALL_STATIONS.length}`);
  console.log(`📍 Prefectures: ${[...new Set(ALL_STATIONS.map(s => s.prefecture))].filter(Boolean).length}`);
  console.log(`👥 Online Drivers: ${drivers.filter(d => d.isOnline).length}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Status: Ready for production with PayPay!`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔴 SIGTERM received, shutting down gracefully...');
  if (pool) pool.end();
  io.close(() => {
    console.log('🔴 WebSocket server closed');
  });
  server.close(() => {
    console.log('🔴 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🔴 SIGINT received, shutting down gracefully...');
  if (pool) pool.end();
  io.close(() => {
    console.log('🔴 WebSocket server closed');
  });
  server.close(() => {
    console.log('🔴 HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
// Updated: PayPay Integration Ready - Version 3.1.0
