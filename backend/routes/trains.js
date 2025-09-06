const express = require('express');
const router = express.Router();

// Get train schedule for a station
router.get('/schedule', async (req, res) => {
  const { station } = req.query;
  
  // Generate realistic schedule based on current time
  const now = new Date();
  const hour = now.getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
  
  const trains = [];
  const lines = [
    { id: 'JR_YAMANOTE', name: '山手線', color: '#9ACD32', platforms: ['1番線', '2番線'] },
    { id: 'JR_CHUO', name: '中央線', color: '#FFA500', platforms: ['7番線', '8番線'] },
    { id: 'JR_KEIHIN_TOHOKU', name: '京浜東北線', color: '#00BFFF', platforms: ['3番線', '4番線'] },
    { id: 'JR_SOBU', name: '総武線', color: '#FFD700', platforms: ['5番線', '6番線'] }
  ];
  
  const destinations = {
    'JR_YAMANOTE': ['品川・渋谷方面', '上野・池袋方面'],
    'JR_CHUO': ['新宿・立川方面', '東京方面'],
    'JR_KEIHIN_TOHOKU': ['大宮方面', '大船方面'],
    'JR_SOBU': ['千葉方面', '三鷹方面']
  };
  
  // Generate next 5 trains for each line
  lines.forEach(line => {
    for (let i = 0; i < 2; i++) {
      const baseInterval = isRushHour ? 2 : 4;
      const arrivalMinutes = baseInterval * (i + 1) + Math.floor(Math.random() * 2);
      const isDelayed = isRushHour && Math.random() > 0.7;
      
      trains.push({
        trainId: `${line.id}_${Date.now()}_${i}`,
        line: line.id,
        lineName: line.name,
        lineColor: line.color,
        destination: destinations[line.id][i % 2],
        platform: line.platforms[i % 2],
        arrivalMinutes: arrivalMinutes,
        arrivalTime: new Date(now.getTime() + arrivalMinutes * 60000).toISOString(),
        status: isDelayed ? 'delayed' : 'on_time',
        delayMinutes: isDelayed ? Math.floor(Math.random() * 5) + 3 : 0,
        delayReason: isDelayed ? '混雑のため' : null,
        crowdLevel: isRushHour ? 'high' : 'medium',
        crowdIcon: isRushHour ? '🟠' : '🟡'
      });
    }
  });
  
  // Sort by arrival time
  trains.sort((a, b) => a.arrivalMinutes - b.arrivalMinutes);
  
  res.json({
    station: station || 'tokyo',
    trains: trains.slice(0, 10), // Return next 10 trains
    timestamp: new Date().toISOString()
  });
});

// Check for train delays
router.post('/delays', async (req, res) => {
  const { stationId, lineId } = req.body;
  
  const hour = new Date().getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
  
  // Higher chance of delays during rush hour
  const delayProbability = isRushHour ? 0.4 : 0.1;
  const hasDelay = Math.random() < delayProbability;
  
  const delayReasons = [
    '混雑のため',
    '信号確認のため',
    '車両点検のため',
    '線路内人立入りのため',
    '急病人救護のため'
  ];
  
  res.json({
    hasDelay,
    delayMinutes: hasDelay ? Math.floor(Math.random() * 15) + 5 : 0,
    reason: hasDelay ? delayReasons[Math.floor(Math.random() * delayReasons.length)] : null,
    affectedLines: hasDelay ? [lineId] : [],
    recoveryTime: hasDelay ? new Date(Date.now() + 30 * 60000).toISOString() : null,
    recommendation: hasDelay ? 'タクシー利用をお勧めします' : null
  });
});

// Get train status for all lines
router.get('/status', async (req, res) => {
  res.json({
    operational: true,
    lastUpdated: new Date().toISOString(),
    message: 'All lines operational'
  });
});

// Train sync booking
router.post('/train-sync', async (req, res) => {
  const { trainId, pickupTime, destination, platform } = req.body;
  
  // Create a booking synchronized with train arrival
  const booking = {
    bookingId: `SYNC_${Date.now()}`,
    trainId,
    pickupTime,
    destination,
    platform,
    status: 'scheduled',
    estimatedFare: 1500 + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    booking
  });
});

module.exports = router;
