const express = require('express');
const router = express.Router();
const axios = require('axios'); // Use axios instead of node-fetch

// ODPT API configuration (use environment variable)
const ODPT_API_KEY = process.env.ODPT_API_KEY || null;
const ODPT_BASE_URL = 'https://api.odpt.org/api/v4';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Clean line name mapping
const lineNameMap = {
  'odpt.Railway:JR-East.Yamanote': '山手線',
  'odpt.Railway:JR-East.ChuoRapid': '中央線快速',
  'odpt.Railway:JR-East.Keihin-Tohoku': '京浜東北線',
  'odpt.Railway:JR-East.Sobu': '総武線',
  'odpt.Railway:JR-East.Tokaido': '東海道線',
  'odpt.Railway:JR-East.Yokosuka': '横須賀線',
  'odpt.Railway:JR-East.Shonan-Shinjuku': '湘南新宿ライン',
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

// Get clean line name from ODPT ID
function getLineNameFromId(lineId) {
  if (lineNameMap[lineId]) {
    return lineNameMap[lineId];
  }
  
  // Extract name from ID
  const parts = lineId.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Simple cleanup for common patterns
  if (lastPart.includes('Toei')) {
    return lastPart.replace('Toei', '都営') + '線';
  }
  if (lastPart.includes('Metro')) {
    return lastPart.replace('Metro', 'メトロ') + '線';
  }
  if (lastPart.includes('JR')) {
    return lastPart.replace('JR-East.', 'JR') + '線';
  }
  
  return lastPart + '線';
}

// Get line color
function getLineColor(lineId) {
  const colorMap = {
    'odpt.Railway:JR-East.Yamanote': '#9ACD32',
    'odpt.Railway:JR-East.ChuoRapid': '#FFA500',
    'odpt.Railway:JR-East.Keihin-Tohoku': '#00BFFF',
    'odpt.Railway:TokyoMetro.Ginza': '#FF9500',
    'odpt.Railway:TokyoMetro.Marunouchi': '#FF0000',
    'odpt.Railway:TokyoMetro.Hibiya': '#708090',
    'odpt.Railway:Toei.Oedo': '#D7156B'
  };
  
  return colorMap[lineId] || '#666666';
}

// Generate recommendation based on delay
function getRecommendation(delayMinutes) {
  if (delayMinutes >= 30) {
    return {
      type: 'urgent',
      message: '30分以上の遅延。タクシーの利用を強く推奨します。',
      action: 'auto_book'
    };
  } else if (delayMinutes >= 15) {
    return {
      type: 'recommended',
      message: '15分以上の遅延。タクシーの利用をお勧めします。',
      action: 'suggest_book'
    };
  } else if (delayMinutes >= 10) {
    return {
      type: 'info',
      message: '10分程度の遅延が発生しています。',
      action: 'monitor'
    };
  }
  return null;
}

// Get train lines for a station
router.get('/station/:stationName/lines', async (req, res) => {
  try {
    const { stationName } = req.params;
    const cacheKey = `lines_${stationName}`;
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        lines: cached
      });
    }
    
    // If ODPT API is configured, use it
    if (ODPT_API_KEY) {
      try {
        const response = await axios.get(`${ODPT_BASE_URL}/odpt:Station`, {
          params: {
            'dc:title': stationName,
            'acl:consumerKey': ODPT_API_KEY
          },
          timeout: 5000
        });
        
        if (response.data && response.data.length > 0) {
          const lines = response.data.map(station => ({
            id: station['odpt:railway'],
            name: getLineNameFromId(station['odpt:railway']),
            operator: station['odpt:operator'],
            color: getLineColor(station['odpt:railway'])
          }));
          
          setCache(cacheKey, lines);
          return res.json({
            success: true,
            lines: lines
          });
        }
      } catch (apiError) {
        console.error('ODPT API error:', apiError.message);
        // Fall through to mock data
      }
    }
    
    // Mock data as fallback
    const mockLines = [
      {
        id: 'odpt.Railway:JR-East.Yamanote',
        name: '山手線',
        operator: 'JR東日本',
        color: '#9ACD32'
      },
      {
        id: 'odpt.Railway:TokyoMetro.Ginza',
        name: '銀座線',
        operator: '東京メトロ',
        color: '#FF9500'
      }
    ];
    
    setCache(cacheKey, mockLines);
    res.json({
      success: true,
      lines: mockLines
    });
  } catch (error) {
    console.error('Error fetching station lines:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch station lines'
    });
  }
});

// Check delays for specific lines
router.post('/delays/check', async (req, res) => {
  try {
    const { stationName, lineIds } = req.body;
    
    if (!lineIds || !Array.isArray(lineIds)) {
      return res.status(400).json({ 
        success: false,
        error: 'lineIds array is required' 
      });
    }
    
    // If ODPT API is available, check real delays
    if (ODPT_API_KEY) {
      try {
        const delayPromises = lineIds.map(lineId => checkDelayForLine(lineId));
        const delayResults = await Promise.all(delayPromises);
        
        const delays = delayResults.filter(d => d.isDelayed);
        const maxDelay = Math.max(...delays.map(d => d.delayMinutes), 0);
        
        const result = {
          success: true,
          hasDelays: delays.length > 0,
          delays: delays,
          affectedLines: delays.map(d => d.lineName),
          maxDelay: maxDelay,
          recommendation: getRecommendation(maxDelay),
          timestamp: new Date().toISOString()
        };
        
        return res.json(result);
      } catch (apiError) {
        console.error('Delay check API error:', apiError.message);
        // Fall through to mock data
      }
    }
    
    // Mock delay data (for development/demo)
    const hasDelays = Math.random() > 0.7; // 30% chance of delays
    const mockDelays = hasDelays ? [
      {
        isDelayed: true,
        lineName: '大江戸線',
        delayMinutes: Math.floor(Math.random() * 20) + 10,
        status: '遅延',
        description: '混雑のため遅延しています',
        updatedAt: new Date().toISOString()
      }
    ] : [];
    
    const maxDelay = Math.max(...mockDelays.map(d => d.delayMinutes), 0);
    
    res.json({
      success: true,
      hasDelays: hasDelays,
      delays: mockDelays,
      affectedLines: mockDelays.map(d => d.lineName),
      maxDelay: maxDelay,
      recommendation: getRecommendation(maxDelay),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking delays:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check delays'
    });
  }
});

// Real-time train information
router.get('/trains/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const cacheKey = `trains_${lineId}`;
    
    // Check cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        trains: cached
      });
    }
    
    // Try ODPT API if available
    if (ODPT_API_KEY) {
      try {
        const response = await axios.get(`${ODPT_BASE_URL}/odpt:Train`, {
          params: {
            'odpt:railway': lineId,
            'acl:consumerKey': ODPT_API_KEY
          },
          timeout: 5000
        });
        
        if (response.data && response.data.length > 0) {
          const trains = response.data.map(train => ({
            trainNumber: train['odpt:trainNumber'],
            trainType: train['odpt:trainType'],
            destination: train['odpt:destinationStation']?.[0],
            currentStation: train['odpt:fromStation'],
            delay: train['odpt:delay'] || 0,
            delayMinutes: Math.floor((train['odpt:delay'] || 0) / 60),
            direction: train['odpt:railDirection'],
            updatedAt: train['dc:date']
          }));
          
          setCache(cacheKey, trains, 30000); // 30 second cache
          return res.json({
            success: true,
            trains: trains
          });
        }
      } catch (apiError) {
        console.error('Train info API error:', apiError.message);
        // Fall through to mock data
      }
    }
    
    // Mock train data
    const mockTrains = [
      {
        trainNumber: '1234E',
        trainType: '各駅停車',
        destination: '東京',
        currentStation: '新宿',
        delay: 0,
        delayMinutes: 0,
        direction: '内回り',
        updatedAt: new Date().toISOString()
      }
    ];
    
    setCache(cacheKey, mockTrains, 30000);
    res.json({
      success: true,
      trains: mockTrains
    });
  } catch (error) {
    console.error('Error fetching train info:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch train information'
    });
  }
});

// Get next trains from a station
router.get('/station/:stationName/timetable', async (req, res) => {
  try {
    const { stationName } = req.params;
    const { direction } = req.query;
    
    // Generate mock timetable
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const nextTrains = [];
    for (let i = 0; i < 5; i++) {
      const departureTime = new Date(now.getTime() + (i * 3 + 2) * 60000);
      nextTrains.push({
        departureTime: `${departureTime.getHours().toString().padStart(2, '0')}:${departureTime.getMinutes().toString().padStart(2, '0')}`,
        destination: ['東京', '品川', '渋谷', '新宿', '池袋'][i % 5],
        trainType: i % 3 === 0 ? '快速' : '各駅停車',
        platform: (i % 2) + 1
      });
    }
    
    res.json({
      success: true,
      station: stationName,
      direction: direction,
      nextTrains: nextTrains,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch timetable'
    });
  }
});

// Create delay alert
router.post('/delays/alert', async (req, res) => {
  try {
    const { 
      userId, 
      stationName, 
      delays, 
      autoBook 
    } = req.body;
    
    if (!userId || !stationName) {
      return res.status(400).json({
        success: false,
        error: 'userId and stationName are required'
      });
    }
    
    // Create alert
    const alert = {
      id: generateId(),
      userId,
      stationName,
      delays: delays || [],
      timestamp: new Date().toISOString(),
      autoBookingTriggered: autoBook || false
    };
    
    // Save to database if available
    if (req.db) {
      try {
        await req.db.query(
          'INSERT INTO delay_alerts (id, user_id, station_name, delay_data, auto_booking, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [alert.id, userId, stationName, JSON.stringify(delays), autoBook, new Date()]
        );
      } catch (dbError) {
        console.error('Database save failed:', dbError);
      }
    }
    
    res.json({
      success: true,
      alert: alert
    });
  } catch (error) {
    console.error('Error creating delay alert:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create delay alert'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'healthy',
    message: 'Train API is running',
    odptConfigured: !!ODPT_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Helper function to check delay for a specific line
async function checkDelayForLine(lineId) {
  try {
    if (!ODPT_API_KEY) {
      return {
        isDelayed: false,
        lineName: getLineNameFromId(lineId),
        delayMinutes: 0,
        status: '情報なし',
        description: 'API設定なし'
      };
    }
    
    const response = await axios.get(`${ODPT_BASE_URL}/odpt:TrainInformation`, {
      params: {
        'odpt:railway': lineId,
        'acl:consumerKey': ODPT_API_KEY
      },
      timeout: 5000
    });
    
    if (!response.data || response.data.length === 0) {
      return {
        isDelayed: false,
        lineName: getLineNameFromId(lineId),
        delayMinutes: 0,
        status: '正常運行',
        description: '遅延はありません'
      };
    }
    
    const info = response.data[0];
    const status = info['odpt:trainInformationStatus']?.ja || '情報なし';
    const text = info['odpt:trainInformationText']?.ja || '';
    
    // Extract delay minutes from text
    const delayMatch = text.match(/約?(\d+)分/);
    const delayMinutes = delayMatch ? parseInt(delayMatch[1]) : 0;
    
    return {
      isDelayed: status !== '平常運転' || delayMinutes > 0,
      lineName: getLineNameFromId(lineId),
      delayMinutes: delayMinutes,
      status: status,
      description: text || '遅延情報はありません',
      updatedAt: info['dc:date']
    };
  } catch (error) {
    console.error(`Error checking delay for ${lineId}:`, error.message);
    return {
      isDelayed: false,
      lineName: getLineNameFromId(lineId),
      delayMinutes: 0,
      status: 'エラー',
      description: '情報を取得できませんでした'
    };
  }
}

// Generate unique ID
function generateId() {
  return 'TR' + Date.now() + Math.random().toString(36).substr(2, 9);
}

module.exports = router;
