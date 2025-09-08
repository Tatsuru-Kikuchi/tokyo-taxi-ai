// backend/routes/trains.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// ODPT API configuration
const ODPT_API_KEY = process.env.ODPT_API_KEY || 'pv3srzgo4tfolzf0a323n4zmsng5j1gl81yk3mwwrirfxzfxjqbsc5ki0byh0xn6';
const ODPT_BASE_URL = 'https://api.odpt.org/api/v4';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Database models (adjust based on your ORM)
const { TrainDelay, DelayAlert, BookingTrainSync } = require('../models');

// Helper function to get from cache
const getFromCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

// Helper function to set cache
const setCache = (key, data, duration = CACHE_DURATION) => {
  cache.set(key, {
    data: data,
    expiry: Date.now() + duration
  });
};

// Clean line name mapping
const cleanLineName = (lineId) => {
  const lineNameMap = {
    'odpt.Railway:JR-East.Yamanote': '山手線',
    'odpt.Railway:JR-East.ChuoRapid': '中央線快速',
    'odpt.Railway:JR-East.Keihin-Tohoku': '京浜東北線',
    'odpt.Railway:JR-East.Sobu': '総武線',
    'odpt.Railway:TokyoMetro.Ginza': '銀座線',
    'odpt.Railway:TokyoMetro.Marunouchi': '丸ノ内線',
    'odpt.Railway:TokyoMetro.Hibiya': '日比谷線',
    'odpt.Railway:TokyoMetro.Tozai': '東西線',
    'odpt.Railway:TokyoMetro.Chiyoda': '千代田線',
    'odpt.Railway:TokyoMetro.Yurakucho': '有楽町線',
    'odpt.Railway:TokyoMetro.Hanzomon': '半蔵門線',
    'odpt.Railway:TokyoMetro.Namboku': '南北線',
    'odpt.Railway:TokyoMetro.Fukutoshin': '副都心線',
    'odpt.Railway:Toei.Asakusa': '浅草線',
    'odpt.Railway:Toei.Mita': '三田線',
    'odpt.Railway:Toei.Shinjuku': '新宿線',
    'odpt.Railway:Toei.Oedo': '大江戸線'
  };
  
  return lineNameMap[lineId] || lineId.split(':').pop();
};

/**
 * GET /api/trains/station/:stationName
 * Get train lines for a specific station
 */
router.get('/station/:stationName', async (req, res) => {
  try {
    const { stationName } = req.params;
    const cacheKey = `station_${stationName}`;
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Fetch from ODPT API
    const response = await fetch(
      `${ODPT_BASE_URL}/odpt:Station?dc:title=${encodeURIComponent(stationName)}&acl:consumerKey=${ODPT_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch station data');
    }
    
    const data = await response.json();
    
    const lines = data.map(station => ({
      id: station['odpt:railway'],
      name: cleanLineName(station['odpt:railway']),
      operator: station['odpt:operator'],
      stationCode: station['odpt:stationCode']
    }));
    
    setCache(cacheKey, lines);
    res.json({ success: true, lines });
    
  } catch (error) {
    console.error('Station fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch station information' 
    });
  }
});

/**
 * GET /api/trains/delays/:stationName
 * Check for delays at a specific station
 */
router.get('/delays/:stationName', async (req, res) => {
  try {
    const { stationName } = req.params;
    const cacheKey = `delays_${stationName}`;
    
    // Check cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Get station lines first
    const stationResponse = await fetch(
      `${ODPT_BASE_URL}/odpt:Station?dc:title=${encodeURIComponent(stationName)}&acl:consumerKey=${ODPT_API_KEY}`
    );
    
    const stationData = await stationResponse.json();
    const lineIds = stationData.map(s => s['odpt:railway']);
    
    // Check delays for each line
    const delayPromises = lineIds.map(async (lineId) => {
      const response = await fetch(
        `${ODPT_BASE_URL}/odpt:TrainInformation?odpt:railway=${lineId}&acl:consumerKey=${ODPT_API_KEY}`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data || data.length === 0) return null;
      
      const info = data[0];
      const hasDelay = info['odpt:trainInformationStatus']?.ja !== '平常運転';
      const delayText = info['odpt:trainInformationText']?.ja || '';
      
      // Extract delay minutes
      const delayMatch = delayText.match(/約?(\d+)分/);
      const delayMinutes = delayMatch ? parseInt(delayMatch[1]) : 0;
      
      if (!hasDelay && delayMinutes === 0) return null;
      
      return {
        lineId: lineId,
        lineName: cleanLineName(lineId),
        delayMinutes: delayMinutes,
        status: info['odpt:trainInformationStatus']?.ja || '遅延',
        description: delayText || '遅延が発生しています',
        updatedAt: info['dc:date']
      };
    });
    
    const delayResults = await Promise.all(delayPromises);
    const delays = delayResults.filter(d => d !== null);
    
    const result = {
      success: true,
      stationName: stationName,
      hasDelays: delays.length > 0,
      delays: delays,
      maxDelay: delays.length > 0 ? Math.max(...delays.map(d => d.delayMinutes)) : 0,
      timestamp: new Date().toISOString()
    };
    
    // Store in database for analytics
    if (delays.length > 0) {
      await TrainDelay.create({
        stationName: stationName,
        delays: JSON.stringify(delays),
        maxDelay: result.maxDelay,
        timestamp: new Date()
      });
    }
    
    setCache(cacheKey, result, 30000); // 30 second cache for delays
    res.json(result);
    
  } catch (error) {
    console.error('Delay check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check delays' 
    });
  }
});

/**
 * POST /api/trains/delay-alert
 * Create a delay alert for users
 */
router.post('/delay-alert', async (req, res) => {
  try {
    const { userId, stationName, delays, bookingId } = req.body;
    
    // Create delay alert record
    const alert = await DelayAlert.create({
      userId,
      stationName,
      delays: JSON.stringify(delays),
      bookingId,
      createdAt: new Date()
    });
    
    // Send push notification if user has token
    const user = await User.findById(userId);
    if (user && user.pushToken) {
      await sendPushNotification(user.pushToken, {
        title: '🚨 電車遅延アラート',
        body: `${stationName}で${delays[0].delayMinutes}分の遅延が発生しています`,
        data: {
          type: 'delay_alert',
          stationName,
          delayMinutes: delays[0].delayMinutes
        }
      });
    }
    
    res.json({ 
      success: true, 
      alertId: alert.id,
      message: 'Delay alert created successfully' 
    });
    
  } catch (error) {
    console.error('Delay alert error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create delay alert' 
    });
  }
});

/**
 * GET /api/trains/schedule/:stationName
 * Get next trains from a station
 */
router.get('/schedule/:stationName', async (req, res) => {
  try {
    const { stationName } = req.params;
    const { direction } = req.query;
    const cacheKey = `schedule_${stationName}_${direction || 'all'}`;
    
    // Check cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Fetch timetable from ODPT
    const response = await fetch(
      `${ODPT_BASE_URL}/odpt:StationTimetable?odpt:station=${encodeURIComponent(stationName)}&acl:consumerKey=${ODPT_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch timetable');
    }
    
    const data = await response.json();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const nextTrains = [];
    
    data.forEach(timetable => {
      const weekdayTable = timetable['odpt:weekdays'] || [];
      const validTrains = weekdayTable.filter(train => {
        const time = train['odpt:departureTime'];
        if (!time) return false;
        
        const [hour, minute] = time.split(':').map(Number);
        return hour > currentHour || (hour === currentHour && minute >= currentMinute);
      });
      
      validTrains.slice(0, 5).forEach(train => {
        nextTrains.push({
          departureTime: train['odpt:departureTime'],
          destination: train['odpt:destinationStation']?.[0],
          trainType: train['odpt:trainType'],
          platform: train['odpt:platformNumber'],
          lineName: cleanLineName(timetable['odpt:railway'])
        });
      });
    });
    
    // Sort by departure time
    nextTrains.sort((a, b) => 
      a.departureTime.localeCompare(b.departureTime)
    );
    
    const result = {
      success: true,
      stationName: stationName,
      trains: nextTrains.slice(0, 10),
      timestamp: new Date().toISOString()
    };
    
    setCache(cacheKey, result);
    res.json(result);
    
  } catch (error) {
    console.error('Schedule fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch train schedule' 
    });
  }
});

/**
 * POST /api/trains/sync-booking
 * Sync booking with train delays
 */
router.post('/sync-booking', async (req, res) => {
  try {
    const { bookingId, stationName, autoBook } = req.body;
    
    // Check current delays
    const delayResponse = await fetch(
      `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/trains/delays/${stationName}`
    );
    
    const delayData = await delayResponse.json();
    
    // Create sync record
    const sync = await BookingTrainSync.create({
      bookingId,
      stationName,
      hasDelay: delayData.hasDelays,
      delayMinutes: delayData.maxDelay || 0,
      autoBooked: autoBook && delayData.maxDelay >= 30,
      syncedAt: new Date()
    });
    
    // If significant delay and auto-booking enabled
    if (autoBook && delayData.maxDelay >= 30) {
      // Trigger auto-booking
      const booking = await Booking.findById(bookingId);
      if (booking && booking.status === 'pending') {
        booking.status = 'auto_confirmed';
        booking.autoBookReason = `Train delay: ${delayData.maxDelay} minutes`;
        await booking.save();
        
        // Send notification
        const user = await User.findById(booking.userId);
        if (user && user.pushToken) {
          await sendPushNotification(user.pushToken, {
            title: '🚕 自動配車完了',
            body: `${delayData.maxDelay}分の遅延を検知。タクシーを自動手配しました`,
            data: {
              type: 'auto_booking',
              bookingId: bookingId
            }
          });
        }
      }
    }
    
    res.json({
      success: true,
      syncId: sync.id,
      hasDelay: delayData.hasDelays,
      maxDelay: delayData.maxDelay,
      autoBooked: sync.autoBooked
    });
    
  } catch (error) {
    console.error('Booking sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync booking with train status' 
    });
  }
});

/**
 * GET /api/trains/history/:userId
 * Get user's delay history and auto-bookings
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    // Get delay alerts
    const alerts = await DelayAlert.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });
    
    // Get auto-bookings
    const autoBookings = await Booking.findAll({
      where: { 
        userId,
        autoBookReason: { $ne: null }
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      delays: alerts.map(a => ({
        id: a.id,
        stationName: a.stationName,
        delays: JSON.parse(a.delays),
        timestamp: a.createdAt
      })),
      autoBookings: autoBookings.map(b => ({
        id: b.id,
        reason: b.autoBookReason,
        fare: b.fare,
        timestamp: b.createdAt
      })),
      stats: {
        totalDelaysExperienced: alerts.length,
        totalAutoBookings: autoBookings.length,
        timeSaved: autoBookings.length * 20 // Estimate 20 min saved per auto-booking
      }
    });
    
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch history' 
    });
  }
});

/**
 * GET /api/trains/analytics
 * Get delay analytics for business intelligence
 */
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate) where.timestamp = { $gte: new Date(startDate) };
    if (endDate) where.timestamp = { ...where.timestamp, $lte: new Date(endDate) };
    
    const delays = await TrainDelay.findAll({
      where,
      order: [['timestamp', 'DESC']]
    });
    
    // Analyze delay patterns
    const stationStats = {};
    const hourlyStats = Array(24).fill(0);
    const lineStats = {};
    
    delays.forEach(delay => {
      // Station frequency
      stationStats[delay.stationName] = (stationStats[delay.stationName] || 0) + 1;
      
      // Hourly distribution
      const hour = new Date(delay.timestamp).getHours();
      hourlyStats[hour]++;
      
      // Line analysis
      const delayData = JSON.parse(delay.delays);
      delayData.forEach(d => {
        if (!lineStats[d.lineName]) {
          lineStats[d.lineName] = {
            count: 0,
            totalMinutes: 0,
            maxDelay: 0
          };
        }
        lineStats[d.lineName].count++;
        lineStats[d.lineName].totalMinutes += d.delayMinutes;
        lineStats[d.lineName].maxDelay = Math.max(
          lineStats[d.lineName].maxDelay,
          d.delayMinutes
        );
      });
    });
    
    // Calculate averages
    Object.keys(lineStats).forEach(line => {
      lineStats[line].averageDelay = 
        Math.round(lineStats[line].totalMinutes / lineStats[line].count);
    });
    
    res.json({
      success: true,
      period: {
        start: startDate || 'all time',
        end: endDate || 'now'
      },
      totalDelays: delays.length,
      stationStats: Object.entries(stationStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([station, count]) => ({ station, count })),
      hourlyDistribution: hourlyStats,
      lineStats: Object.entries(lineStats)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([line, stats]) => ({ line, ...stats })),
      peakHours: hourlyStats
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate analytics' 
    });
  }
});

/**
 * POST /api/trains/subscribe
 * Subscribe to delay notifications for specific stations
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { userId, stations, threshold = 20 } = req.body;
    
    // Store subscription preferences
    const subscription = await TrainSubscription.create({
      userId,
      stations: JSON.stringify(stations),
      delayThreshold: threshold,
      active: true,
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      subscriptionId: subscription.id,
      message: `Subscribed to delays for ${stations.length} stations`
    });
    
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create subscription' 
    });
  }
});

// Helper function for push notifications
async function sendPushNotification(token, notification) {
  // Implement based on your push notification service
  // Example for Firebase:
  /*
  const message = {
    token: token,
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: notification.data
  };
  
  await admin.messaging().send(message);
  */
}

module.exports = router;
