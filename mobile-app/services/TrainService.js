// services/TrainService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import stationMapper from '../utils/station_mapping';

const ODPT_API_KEY = 'pv3srzgo4tfolzf0a323n4zmsng5j1gl81yk3mwwrirfxzfxjqbsc5ki0byh0xn6'; // Replace with your actual key
const ODPT_BASE_URL = 'https://api.odpt.org/api/v4';
const CACHE_DURATION = 60000; // 1 minute cache

class TrainService {
  constructor() {
    this.cache = new Map();
    this.delaySubscriptions = new Map();

    // Clean line name mappings
    this.lineNameMap = {
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
      'odpt.Railway:Toei.Oedo': '大江戸線',
      'odpt.Railway:Tokyu.Toyoko': '東急東横線',
      'odpt.Railway:Tokyu.Den-en-toshi': '東急田園都市線',
      'odpt.Railway:Keio.Keio': '京王線',
      'odpt.Railway:Odakyu.Odawara': '小田急線',
      'odpt.Railway:Seibu.Ikebukuro': '西武池袋線',
      'odpt.Railway:Seibu.Shinjuku': '西武新宿線',
      'odpt.Railway:Tobu.Tojo': '東武東上線',
      'odpt.Railway:Keisei.Main': '京成本線',
      'odpt.Railway:Keikyu.Main': '京急本線'
    };
  }

  // Get train lines for a station using the mapping
  async getStationLines(stationName) {
    const cacheKey = `lines_${stationName}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // First try to get from station mapper
      const mappedLines = stationMapper.getLinesByStation(stationName);

      if (mappedLines.length > 0) {
        const lines = mappedLines.map(lineId => ({
          id: lineId,
          name: this.getCleanLineName(lineId),
          operator: this.extractOperatorFromId(lineId),
          color: this.getLineColor(lineId)
        }));

        this.setCache(cacheKey, lines);
        return lines;
      }

      // Fallback to API if not in mapping
      const response = await fetch(
        `${ODPT_BASE_URL}/odpt:Station?dc:title=${encodeURIComponent(stationName)}&acl:consumerKey=${ODPT_API_KEY}`
      );

      if (!response.ok) throw new Error('Failed to fetch station data');

      const data = await response.json();
      const lines = this.extractLinesFromStation(data);

      this.setCache(cacheKey, lines);
      return lines;
    } catch (error) {
      console.error('Error fetching station lines:', error);
      return this.getMockStationLines(stationName);
    }
  }

  // Get clean Japanese line name
  getCleanLineName(lineId) {
    // Return mapped name if exists
    if (this.lineNameMap[lineId]) {
      return this.lineNameMap[lineId];
    }

    // Try to extract and clean from ID
    const parts = lineId.split(':');
    if (parts.length > 1) {
      const operatorAndLine = parts[1];
      const linePart = operatorAndLine.split('.').pop();

      // Common line name replacements
      const replacements = {
        'Yamanote': '山手線',
        'ChuoRapid': '中央線快速',
        'Sobu': '総武線',
        'Tokaido': '東海道線',
        'Main': '本線'
      };

      return replacements[linePart] || linePart;
    }

    return '不明な路線';
  }

  // Extract operator from ODPT ID
  extractOperatorFromId(lineId) {
    const parts = lineId.split(':');
    if (parts.length > 1) {
      const operator = parts[1].split('.')[0];
      const operatorNames = {
        'JR-East': 'JR東日本',
        'JR-West': 'JR西日本',
        'JR-Central': 'JR東海',
        'JR-Kyushu': 'JR九州',
        'JR-Hokkaido': 'JR北海道',
        'TokyoMetro': '東京メトロ',
        'Toei': '都営',
        'OsakaMetro': '大阪メトロ',
        'Tokyu': '東急',
        'Keio': '京王',
        'Odakyu': '小田急',
        'Seibu': '西武',
        'Tobu': '東武',
        'Keisei': '京成',
        'Keikyu': '京急',
        'Hankyu': '阪急',
        'Hanshin': '阪神',
        'Kintetsu': '近鉄',
        'Nankai': '南海',
        'Meitetsu': '名鉄'
      };
      return operatorNames[operator] || operator;
    }
    return '不明';
  }

  // Get real-time train information
  async getTrainInfo(lineId) {
    const cacheKey = `train_${lineId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${ODPT_BASE_URL}/odpt:Train?odpt:railway=${lineId}&acl:consumerKey=${ODPT_API_KEY}`
      );

      if (!response.ok) throw new Error('Failed to fetch train data');

      const data = await response.json();
      const trainInfo = this.processTrainData(data);

      this.setCache(cacheKey, trainInfo, 30000); // 30 second cache for real-time data
      return trainInfo;
    } catch (error) {
      console.error('Error fetching train info:', error);
      return this.getMockTrainInfo(lineId);
    }
  }

  // Check for delays on specific lines
  async checkDelays(stationName, lines = []) {
    try {
      const delayPromises = lines.map(line => this.getDelayInfo(line));
      const delayResults = await Promise.all(delayPromises);

      const delays = delayResults.filter(d => d.isDelayed);

      if (delays.length > 0) {
        await this.saveDelayNotification(stationName, delays);
      }

      return {
        hasDelays: delays.length > 0,
        delays: delays,
        affectedLines: delays.map(d => d.lineName),
        maxDelay: Math.max(...delays.map(d => d.delayMinutes), 0),
        recommendation: this.getRecommendation(delays)
      };
    } catch (error) {
      console.error('Error checking delays:', error);
      return this.getMockDelayStatus();
    }
  }

  // Get delay information for a specific line
  async getDelayInfo(lineId) {
    try {
      const response = await fetch(
        `${ODPT_BASE_URL}/odpt:TrainInformation?odpt:railway=${lineId}&acl:consumerKey=${ODPT_API_KEY}`
      );

      if (!response.ok) throw new Error('Failed to fetch delay info');

      const data = await response.json();
      return this.processDelayData(data[0] || {}, lineId);
    } catch (error) {
      console.error('Error fetching delay info:', error);
      return {
        isDelayed: false,
        lineName: this.getCleanLineName(lineId),
        delayMinutes: 0
      };
    }
  }

  // Get next trains from a station
  async getNextTrains(stationName, direction = null) {
    const cacheKey = `next_${stationName}_${direction}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${ODPT_BASE_URL}/odpt:StationTimetable?odpt:station=${stationName}&acl:consumerKey=${ODPT_API_KEY}`
      );

      if (!response.ok) throw new Error('Failed to fetch timetable');

      const data = await response.json();
      const nextTrains = this.processTimeTable(data, direction);

      this.setCache(cacheKey, nextTrains);
      return nextTrains;
    } catch (error) {
      console.error('Error fetching next trains:', error);
      return this.getMockNextTrains(stationName);
    }
  }

  // Subscribe to delay notifications for a station
  async subscribeToDelays(stationName, callback) {
    const subscriptionId = `${stationName}_${Date.now()}`;

    const checkInterval = setInterval(async () => {
      const lines = await this.getStationLines(stationName);
      const delayStatus = await this.checkDelays(stationName, lines.map(l => l.id));

      if (delayStatus.hasDelays) {
        callback(delayStatus);
      }
    }, 60000); // Check every minute

    this.delaySubscriptions.set(subscriptionId, checkInterval);
    return subscriptionId;
  }

  // Unsubscribe from delay notifications
  unsubscribeFromDelays(subscriptionId) {
    const interval = this.delaySubscriptions.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.delaySubscriptions.delete(subscriptionId);
    }
  }

  // Process and extract data methods
  extractLinesFromStation(stationData) {
    if (!stationData || stationData.length === 0) return [];

    return stationData.map(station => ({
      id: station['odpt:railway'],
      name: this.getCleanLineName(station['odpt:railway']),
      operator: station['odpt:operator'],
      color: this.getLineColor(station['odpt:railway'])
    }));
  }

  processTrainData(trainData) {
    return trainData.map(train => ({
      trainNumber: train['odpt:trainNumber'],
      trainType: train['odpt:trainType'],
      destination: train['odpt:destinationStation']?.[0],
      currentStation: train['odpt:fromStation'],
      delay: train['odpt:delay'] || 0,
      delayMinutes: Math.floor((train['odpt:delay'] || 0) / 60),
      direction: train['odpt:railDirection'],
      updatedAt: train['dc:date']
    }));
  }

  processDelayData(delayInfo, lineId) {
    const hasDelay = delayInfo['odpt:trainInformationStatus']?.ja !== '平常運転';
    const delayText = delayInfo['odpt:trainInformationText']?.ja || '';

    // Extract delay minutes from text (e.g., "約10分の遅れ")
    const delayMatch = delayText.match(/約?(\d+)分/);
    const delayMinutes = delayMatch ? parseInt(delayMatch[1]) : 0;

    // Clean up the description - remove technical terms
    let cleanDescription = delayText
      .replace(/odpt\.[^、。\s]*/g, '') // Remove odpt references
      .replace(/Railway:[^、。\s]*/g, '') // Remove Railway references
      .trim();

    // If no clean description, provide a simple one
    if (!cleanDescription || cleanDescription.length < 5) {
      if (delayMinutes > 0) {
        cleanDescription = '混雑のため遅延しています';
      } else if (hasDelay) {
        cleanDescription = '運転を見合わせています';
      } else {
        cleanDescription = '正常運転';
      }
    }

    return {
      isDelayed: hasDelay || delayMinutes > 0,
      lineName: this.getCleanLineName(lineId),
      delayMinutes: delayMinutes,
      status: delayInfo['odpt:trainInformationStatus']?.ja || '情報なし',
      description: cleanDescription,
      updatedAt: delayInfo['dc:date']
    };
  }

  processTimeTable(timetableData, direction) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const allTrains = [];

    timetableData.forEach(timetable => {
      const weekdayTable = timetable['odpt:weekdays'] || [];
      const trains = weekdayTable.filter(train => {
        const time = train['odpt:departureTime'];
        if (!time) return false;

        const [hour, minute] = time.split(':').map(Number);
        return hour > currentHour || (hour === currentHour && minute >= currentMinute);
      }).slice(0, 5);

      trains.forEach(train => {
        allTrains.push({
          departureTime: train['odpt:departureTime'],
          destination: train['odpt:destinationStation']?.[0],
          trainType: train['odpt:trainType'],
          platform: train['odpt:platformNumber']
        });
      });
    });

    return allTrains.sort((a, b) =>
      a.departureTime.localeCompare(b.departureTime)
    ).slice(0, 5);
  }

  getRecommendation(delays) {
    if (delays.length === 0) return null;

    const maxDelay = Math.max(...delays.map(d => d.delayMinutes));

    if (maxDelay >= 30) {
      return {
        type: 'urgent',
        message: '30分以上の遅延。タクシーの利用を強く推奨します。',
        action: 'auto_book'
      };
    } else if (maxDelay >= 15) {
      return {
        type: 'recommended',
        message: '15分以上の遅延。タクシーの利用をお勧めします。',
        action: 'suggest_book'
      };
    } else if (maxDelay >= 10) {
      return {
        type: 'info',
        message: '10分程度の遅延が発生しています。',
        action: 'monitor'
      };
    }

    return null;
  }

  // Cache management
  setCache(key, data, duration = CACHE_DURATION) {
    this.cache.set(key, {
      data: data,
      expiry: Date.now() + duration
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
  }

  // Save delay notification to AsyncStorage
  async saveDelayNotification(stationName, delays) {
    try {
      const notification = {
        id: Date.now().toString(),
        stationName: stationName,
        delays: delays,
        timestamp: new Date().toISOString(),
        read: false
      };

      const existingNotifications = await AsyncStorage.getItem('delayNotifications');
      const notifications = existingNotifications ? JSON.parse(existingNotifications) : [];

      notifications.unshift(notification);
      notifications.splice(10); // Keep only last 10 notifications

      await AsyncStorage.setItem('delayNotifications', JSON.stringify(notifications));
      return notification;
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  // Get saved delay notifications
  async getDelayNotifications() {
    try {
      const notifications = await AsyncStorage.getItem('delayNotifications');
      return notifications ? JSON.parse(notifications) : [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Line color mapping
  getLineColor(lineId) {
    const colorMap = {
      'odpt.Railway:JR-East.Yamanote': '#9ACD32',
      'odpt.Railway:JR-East.ChuoRapid': '#FFA500',
      'odpt.Railway:JR-East.Keihin-Tohoku': '#00BFFF',
      'odpt.Railway:JR-East.Sobu': '#FFD700',
      'odpt.Railway:TokyoMetro.Ginza': '#FF9500',
      'odpt.Railway:TokyoMetro.Marunouchi': '#FF0000',
      'odpt.Railway:TokyoMetro.Hibiya': '#708090',
      'odpt.Railway:TokyoMetro.Tozai': '#00BFFF',
      'odpt.Railway:TokyoMetro.Chiyoda': '#00BB00',
      'odpt.Railway:TokyoMetro.Yurakucho': '#D4AF37',
      'odpt.Railway:TokyoMetro.Hanzomon': '#9B7CB6',
      'odpt.Railway:TokyoMetro.Namboku': '#00ADA9',
      'odpt.Railway:TokyoMetro.Fukutoshin': '#7B5544',
      'odpt.Railway:Toei.Asakusa': '#EF4868',
      'odpt.Railway:Toei.Mita': '#006BB3',
      'odpt.Railway:Toei.Shinjuku': '#B0C24A',
      'odpt.Railway:Toei.Oedo': '#CE045B'
    };

    return colorMap[lineId] || '#666666';
  }

  // Mock data fallbacks
  getMockStationLines(stationName) {
    return [
      { id: 'odpt.Railway:JR-East.Yamanote', name: '山手線', operator: 'JR東日本', color: '#9ACD32' },
      { id: 'odpt.Railway:JR-East.ChuoRapid', name: '中央線快速', operator: 'JR東日本', color: '#FFA500' }
    ];
  }

  getMockTrainInfo(lineId) {
    return [
      {
        trainNumber: '1234',
        trainType: '各駅停車',
        destination: '東京',
        currentStation: '新宿',
        delay: 0,
        delayMinutes: 0,
        direction: '内回り',
        updatedAt: new Date().toISOString()
      }
    ];
  }

  getMockDelayStatus() {
    // Simulate delay 30% of the time for testing
    const hasDelay = Math.random() > 0.7;
    const delayMinutes = hasDelay ? Math.floor(Math.random() * 30) + 10 : 0;

    return {
      hasDelays: hasDelay,
      delays: hasDelay ? [{
        isDelayed: true,
        lineName: '大江戸線',
        delayMinutes: delayMinutes,
        status: '遅延',
        description: '混雑のため遅延しています'
      }] : [],
      affectedLines: hasDelay ? ['大江戸線'] : [],
      maxDelay: delayMinutes,
      recommendation: hasDelay ? {
        type: delayMinutes >= 20 ? 'urgent' : 'recommended',
        message: `${delayMinutes}分の遅延。タクシーの利用をお勧めします。`,
        action: delayMinutes >= 20 ? 'auto_book' : 'suggest_book'
      } : null
    };
  }

  getMockNextTrains(stationName) {
    const now = new Date();
    const trains = [];

    for (let i = 0; i < 5; i++) {
      const departureTime = new Date(now.getTime() + (i * 3 + 2) * 60000);
      trains.push({
        departureTime: `${departureTime.getHours().toString().padStart(2, '0')}:${departureTime.getMinutes().toString().padStart(2, '0')}`,
        destination: ['東京', '品川', '渋谷', '新宿', '池袋'][i % 5],
        trainType: i % 3 === 0 ? '快速' : '各駅停車',
        platform: (i % 2) + 1
      });
    }

    return trains;
  }
}

export default new TrainService();
