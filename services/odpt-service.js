const fetch = require('node-fetch');

class ODPTService {
  constructor() {
    this.apiKey = 'pv3srzgo4tfolzf0a323n4zmsng5j1gl81yk3mwwrirfxzfxjqbsc5ki0byh0xn6';
    this.baseUrl = 'https://api.odpt.org/api/v4';
  }

  // Get real-time train data
  async getTrainSchedule(station) {
    try {
      const url = `${this.baseUrl}/odpt:Train?acl:consumerKey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Filter for specific station if provided
      const trains = data.filter(train => 
        !station || train['odpt:fromStation']?.includes(station) || 
        train['odpt:toStation']?.includes(station)
      );
      
      return trains.slice(0, 10).map(train => ({
        trainId: train['@id'],
        trainNumber: train['odpt:trainNumber'],
        trainType: train['odpt:trainType'],
        fromStation: train['odpt:fromStation'],
        toStation: train['odpt:toStation'],
        delay: train['odpt:delay'] || 0,
        carComposition: train['odpt:carComposition'],
        operator: train['odpt:operator']
      }));
    } catch (error) {
      console.error('ODPT Train API error:', error);
      return this.getFallbackTrainData();
    }
  }

  // Get station timetable
  async getStationTimetable(stationId) {
    try {
      const url = `${this.baseUrl}/odpt:StationTimetable?odpt:station=${stationId}&acl:consumerKey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      return data.map(timetable => ({
        station: timetable['odpt:station'],
        railway: timetable['odpt:railway'],
        direction: timetable['odpt:railDirection'],
        weekdays: timetable['odpt:weekdays'],
        saturdays: timetable['odpt:saturdays'],
        holidays: timetable['odpt:holidays']
      }));
    } catch (error) {
      console.error('ODPT Timetable API error:', error);
      return [];
    }
  }

  // Get bus routes
  async getBusSchedule(busStop) {
    try {
      const url = `${this.baseUrl}/odpt:Bus?acl:consumerKey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      return data.slice(0, 5).map(bus => ({
        busId: bus['@id'],
        busNumber: bus['odpt:busNumber'],
        fromBusstop: bus['odpt:fromBusstop'],
        toBusstop: bus['odpt:toBusstop'],
        operator: bus['odpt:operator'],
        progress: bus['odpt:progress']
      }));
    } catch (error) {
      console.error('ODPT Bus API error:', error);
      return this.getFallbackBusData();
    }
  }

  // Get train congestion data
  async getTrainCongestion(trainId) {
    try {
      const url = `${this.baseUrl}/odpt:TrainInformation?acl:consumerKey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      return data.map(info => ({
        railway: info['odpt:railway'],
        status: info['odpt:trainInformationStatus'],
        text: info['odpt:trainInformationText'],
        validFrom: info['dct:valid'],
        operator: info['odpt:operator']
      }));
    } catch (error) {
      console.error('ODPT Congestion API error:', error);
      return [];
    }
  }

  // Fallback data when API fails
  getFallbackTrainData() {
    const now = new Date();
    return [
      {
        trainId: 'JR-East.Yamanote.' + Date.now(),
        trainNumber: '1234G',
        trainType: '山手線',
        fromStation: 'JR-East.Yamanote.Tokyo',
        toStation: 'JR-East.Yamanote.Shinagawa',
        delay: 0,
        operator: 'JR-East'
      },
      {
        trainId: 'JR-East.ChuoRapid.' + Date.now(),
        trainNumber: '567T',
        trainType: '中央線快速',
        fromStation: 'JR-East.ChuoRapid.Tokyo',
        toStation: 'JR-East.ChuoRapid.Shinjuku',
        delay: 120, // 2 minutes delay
        operator: 'JR-East'
      }
    ];
  }

  getFallbackBusData() {
    return [
      {
        busId: 'Toei.Bus.' + Date.now(),
        busNumber: '都01',
        fromBusstop: '東京駅八重洲口',
        toBusstop: '新橋駅',
        operator: 'Toei'
      }
    ];
  }
}

module.exports = new ODPTService();
