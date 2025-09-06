// Tokyo Transit Real-Time Service
// Free API from Tokyo Metropolitan Government

class TokyoTransitService {
  constructor() {
    // Register at: https://api-tokyochallenge.odpt.org/
    this.apiKey = process.env.TOKYO_TRANSIT_API_KEY || 'demo-key';
    this.baseURL = 'https://api-tokyochallenge.odpt.org/api/v4';
  }

  async getNearbyStationsWithRealtimeData(lat, lon, radius = 1000) {
    try {
      // 1. Get nearby stations (static data)
      const stations = await this.getNearbyStations(lat, lon, radius);
      
      // 2. Get real-time train data
      const trainData = await this.getRealtimeTrains();
      
      // 3. Get service alerts
      const alerts = await this.getServiceAlerts();
      
      // 4. Combine data
      return stations.map(station => ({
        ...station,
        delays: alerts.filter(a => a.railway === station.line),
        crowding: this.estimateCrowding(station, new Date()),
        nextTrains: this.getNextTrains(station, trainData),
        suggestedWaitTime: this.calculateWaitTime(station)
      }));
    } catch (error) {
      console.error('Transit API error:', error);
      // Return static data as fallback
      return stations;
    }
  }

  async getRealtimeTrains() {
    const response = await fetch(
      `${this.baseURL}/odpt:Train?acl:consumerKey=${this.apiKey}`
    );
    return response.json();
  }

  async getServiceAlerts() {
    const response = await fetch(
      `${this.baseURL}/odpt:TrainInformation?acl:consumerKey=${this.apiKey}`
    );
    const data = await response.json();
    
    // Parse alerts
    return data.map(alert => ({
      line: alert['odpt:railway'],
      status: alert['odpt:trainInformationStatus'],
      description: alert['odpt:trainInformationText']?.ja || '運行情報あり',
      severity: this.getAlertSeverity(alert)
    }));
  }

  getAlertSeverity(alert) {
    const text = alert['odpt:trainInformationText']?.ja || '';
    if (text.includes('運転見合わせ')) return 'severe';
    if (text.includes('遅延')) return 'moderate';
    if (text.includes('直通運転中止')) return 'minor';
    return 'info';
  }

  estimateCrowding(station, time) {
    const hour = time.getHours();
    
    // Rush hour patterns for Tokyo
    if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20)) {
      return 0.9; // 90% crowded
    } else if (hour >= 10 && hour <= 17) {
      return 0.5; // 50% crowded
    } else {
      return 0.3; // 30% crowded
    }
  }

  calculateWaitTime(station) {
    // Estimate based on line frequency
    const frequencies = {
      'JR-East.Yamanote': 3, // Every 3 minutes
      'TokyoMetro.Ginza': 4, // Every 4 minutes
      'TokyoMetro.Marunouchi': 3,
      'Toei.Oedo': 5,
      // ... add more lines
    };
    
    return frequencies[station.line] || 5;
  }
}

module.exports = TokyoTransitService;