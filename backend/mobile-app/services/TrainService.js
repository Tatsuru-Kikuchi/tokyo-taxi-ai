/**
 * TrainService.js - 全国AIタクシー Train Integration Service
 * Version: 3.0.1
 * Created: September 3, 2025
 *
 * This service handles all train-related functionality including:
 * - Real-time train arrivals
 * - Delay detection
 * - Auto-booking for delayed trains
 * - Platform-specific pickup points
 *
 * Currently using mock data - ready for real API integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';

class TrainService {
  constructor() {
    // Train line definitions with official colors
    this.trainLines = {
      'JR_YAMANOTE': {
        name: '山手線',
        nameEn: 'Yamanote Line',
        color: '#9ACD32',
        avgInterval: 3,
        operator: 'JR East'
      },
      'JR_CHUO': {
        name: '中央線',
        nameEn: 'Chuo Line',
        color: '#FFA500',
        avgInterval: 4,
        operator: 'JR East'
      },
      'JR_KEIHIN_TOHOKU': {
        name: '京浜東北線',
        nameEn: 'Keihin-Tohoku Line',
        color: '#00BFFF',
        avgInterval: 3,
        operator: 'JR East'
      },
      'JR_SOBU': {
        name: '総武線',
        nameEn: 'Sobu Line',
        color: '#FFD700',
        avgInterval: 4,
        operator: 'JR East'
      },
      'METRO_GINZA': {
        name: '銀座線',
        nameEn: 'Ginza Line',
        color: '#FF9500',
        avgInterval: 3,
        operator: 'Tokyo Metro'
      },
      'METRO_MARUNOUCHI': {
        name: '丸ノ内線',
        nameEn: 'Marunouchi Line',
        color: '#FF0000',
        avgInterval: 4,
        operator: 'Tokyo Metro'
      },
      'METRO_HIBIYA': {
        name: '日比谷線',
        nameEn: 'Hibiya Line',
        color: '#B5B5AC',
        avgInterval: 3,
        operator: 'Tokyo Metro'
      },
      'TOEI_OEDO': {
        name: '大江戸線',
        nameEn: 'Oedo Line',
        color: '#CE0067',
        avgInterval: 5,
        operator: 'Toei'
      }
    };

    // Station platform configurations
    this.stationPlatforms = {
      'tokyo': {
        name: '東京駅',
        platforms: {
          '1番線': { lines: ['JR_YAMANOTE'], direction: '品川・渋谷方面' },
          '2番線': { lines: ['JR_YAMANOTE'], direction: '上野・池袋方面' },
          '3番線': { lines: ['JR_KEIHIN_TOHOKU'], direction: '大宮方面' },
          '4番線': { lines: ['JR_KEIHIN_TOHOKU'], direction: '大船方面' },
          '7番線': { lines: ['JR_CHUO'], direction: '新宿・立川方面' },
          '8番線': { lines: ['JR_CHUO'], direction: '千葉方面' }
        }
      },
      'shinjuku': {
        name: '新宿駅',
        platforms: {
          '14番線': { lines: ['JR_YAMANOTE'], direction: '渋谷・品川方面' },
          '15番線': { lines: ['JR_YAMANOTE'], direction: '池袋・上野方面' },
          '7番線': { lines: ['JR_CHUO'], direction: '東京方面' },
          '8番線': { lines: ['JR_CHUO'], direction: '立川・八王子方面' }
        }
      },
      'shibuya': {
        name: '渋谷駅',
        platforms: {
          '1番線': { lines: ['JR_YAMANOTE'], direction: '新宿・池袋方面' },
          '2番線': { lines: ['JR_YAMANOTE'], direction: '品川・東京方面' }
        }
      }
    };

    // Delay patterns (for realistic mock data)
    this.delayPatterns = {
      morning_rush: { start: 7, end: 9, probability: 0.3, avgDelay: 5 },
      evening_rush: { start: 17, end: 20, probability: 0.4, avgDelay: 7 },
      rain: { probability: 0.5, avgDelay: 10 },
      accident: { probability: 0.1, avgDelay: 20 }
    };
  }

  /**
   * Get real-time train arrivals for a station
   */
  async getTrainArrivals(stationId) {
    try {
      // Try to fetch from backend first
      const response = await fetch(`${BACKEND_URL}/api/trains/schedule?station=${stationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        return this.formatTrainArrivals(data);
      }
    } catch (error) {
      console.log('Using mock data due to:', error.message);
    }

    // Generate realistic mock data based on time and conditions
    return this.generateMockArrivals(stationId);
  }

  /**
   * Generate mock train arrivals with realistic patterns
   */
  generateMockArrivals(stationId) {
    const now = new Date();
    const hour = now.getHours();
    const station = this.stationPlatforms[stationId] || this.stationPlatforms['tokyo'];
    const arrivals = [];

    // Generate arrivals for each platform
    Object.entries(station.platforms).forEach(([platform, config]) => {
      config.lines.forEach(lineId => {
        const line = this.trainLines[lineId];
        if (!line) return;

        // Generate next 3 trains for this line/platform
        for (let i = 0; i < 3; i++) {
          const baseInterval = line.avgInterval;
          const minutesUntilArrival = baseInterval * (i + 1) + Math.floor(Math.random() * 2);

          // Determine if this train is delayed
          const delayInfo = this.calculateDelay(hour);

          arrivals.push({
            trainId: `${lineId}_${Date.now()}_${i}`,
            line: lineId,
            lineName: line.name,
            lineColor: line.color,
            platform: platform,
            destination: config.direction,
            arrivalTime: new Date(now.getTime() + minutesUntilArrival * 60000).toISOString(),
            arrivalMinutes: minutesUntilArrival,
            status: delayInfo.isDelayed ? 'delayed' : 'on_time',
            delayMinutes: delayInfo.delayMinutes,
            delayReason: delayInfo.reason,
            crowdLevel: this.calculateCrowdLevel(hour, delayInfo.isDelayed),
            nextStation: this.getNextStation(lineId, stationId, config.direction),
            operator: line.operator
          });
        }
      });
    });

    // Sort by arrival time
    return arrivals.sort((a, b) => a.arrivalMinutes - b.arrivalMinutes);
  }

  /**
   * Calculate delay based on time and conditions
   */
  calculateDelay(hour) {
    // Check rush hour patterns
    const isMorningRush = hour >= 7 && hour <= 9;
    const isEveningRush = hour >= 17 && hour <= 20;

    let isDelayed = false;
    let delayMinutes = 0;
    let reason = '';

    if (isMorningRush && Math.random() < 0.3) {
      isDelayed = true;
      delayMinutes = 3 + Math.floor(Math.random() * 7);
      reason = '混雑のため';
    } else if (isEveningRush && Math.random() < 0.4) {
      isDelayed = true;
      delayMinutes = 5 + Math.floor(Math.random() * 10);
      reason = '混雑のため';
    } else if (Math.random() < 0.1) {
      isDelayed = true;
      delayMinutes = 10 + Math.floor(Math.random() * 20);
      reason = '信号確認のため';
    }

    return { isDelayed, delayMinutes, reason };
  }

  /**
   * Calculate crowd level based on time and delays
   */
  calculateCrowdLevel(hour, isDelayed) {
    const isMorningRush = hour >= 7 && hour <= 9;
    const isEveningRush = hour >= 17 && hour <= 20;

    if (isDelayed) return 'very_high';
    if (isMorningRush || isEveningRush) return 'high';
    if (hour >= 10 && hour <= 16) return 'medium';
    return 'low';
  }

  /**
   * Get next station for a train
   */
  getNextStation(lineId, currentStation, direction) {
    const stationSequence = {
      'JR_YAMANOTE': {
        '品川・渋谷方面': ['有楽町', '新橋', '浜松町', '田町', '品川'],
        '上野・池袋方面': ['神田', '秋葉原', '御徒町', '上野', '鶯谷']
      }
    };

    const sequence = stationSequence[lineId]?.[direction];
    return sequence ? sequence[0] : '次駅';
  }

  /**
   * Check for train delays and notify user
   */
  async checkDelays(stationId, lineId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/trains/delays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, lineId }),
        timeout: 5000
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log('Using mock delay data:', error.message);
    }

    // Mock delay data
    const hour = new Date().getHours();
    const delayInfo = this.calculateDelay(hour);

    return {
      hasDelay: delayInfo.isDelayed,
      delayMinutes: delayInfo.delayMinutes,
      reason: delayInfo.reason,
      affectedLines: [lineId],
      recoveryTime: new Date(Date.now() + (delayInfo.delayMinutes + 15) * 60000).toISOString(),
      recommendation: delayInfo.isDelayed ? 'タクシー利用をお勧めします' : null
    };
  }

  /**
   * Auto-schedule taxi based on train arrival
   */
  async scheduleTaxiForTrain(trainArrival, destination, advanceMinutes = 3) {
    try {
      const arrivalTime = new Date(trainArrival.arrivalTime);
      const pickupTime = new Date(arrivalTime.getTime() - (advanceMinutes * 60000));

      const booking = {
        bookingId: `BOOK_${Date.now()}`,
        trainId: trainArrival.trainId,
        trainLine: trainArrival.lineName,
        trainArrivalTime: trainArrival.arrivalTime,
        platform: trainArrival.platform,
        scheduledPickupTime: pickupTime.toISOString(),
        pickupLocation: this.getPickupPoint(trainArrival.station, trainArrival.platform),
        destination: destination,
        estimatedFare: this.calculateEstimatedFare(trainArrival.crowdLevel),
        status: 'scheduled',
        autoBooked: true,
        createdAt: new Date().toISOString()
      };

      // Save to local storage
      await this.saveScheduledBooking(booking);

      // Send to backend
      try {
        const response = await fetch(`${BACKEND_URL}/api/bookings/train-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking),
          timeout: 5000
        });

        if (response.ok) {
          const serverBooking = await response.json();
          booking.bookingId = serverBooking.id || booking.bookingId;
        }
      } catch (error) {
        console.log('Booking saved locally, will sync later:', error.message);
      }

      return booking;
    } catch (error) {
      console.error('Error scheduling taxi:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated fare based on conditions
   */
  calculateEstimatedFare(crowdLevel) {
    const baseFare = 1500;
    const surgeMultiplier = {
      'very_high': 1.5,
      'high': 1.3,
      'medium': 1.1,
      'low': 1.0
    };

    return Math.round(baseFare * (surgeMultiplier[crowdLevel] || 1.0));
  }

  /**
   * Get platform-specific pickup points
   */
  getPickupPoint(stationId, platform) {
    const pickupPoints = {
      'tokyo': {
        '1番線': { exit: '八重洲北口', walkTime: 3, meetingPoint: 'タクシー乗り場A', gps: { lat: 35.6812, lng: 139.7671 } },
        '2番線': { exit: '八重洲中央口', walkTime: 4, meetingPoint: 'タクシー乗り場B', gps: { lat: 35.6815, lng: 139.7675 } },
        '3番線': { exit: '丸の内南口', walkTime: 5, meetingPoint: 'タクシー乗り場C', gps: { lat: 35.6810, lng: 139.7665 } },
        'default': { exit: '中央口', walkTime: 5, meetingPoint: 'タクシー乗り場', gps: { lat: 35.6812, lng: 139.7671 } }
      },
      'shinjuku': {
        '14番線': { exit: '南口', walkTime: 2, meetingPoint: '新南口タクシー乗り場', gps: { lat: 35.6896, lng: 139.7006 } },
        '15番線': { exit: '東口', walkTime: 3, meetingPoint: '東口タクシー乗り場', gps: { lat: 35.6900, lng: 139.7010 } },
        '7番線': { exit: '西口', walkTime: 4, meetingPoint: '西口タクシー乗り場', gps: { lat: 35.6890, lng: 139.7000 } },
        'default': { exit: '南口', walkTime: 3, meetingPoint: 'タクシー乗り場', gps: { lat: 35.6896, lng: 139.7006 } }
      },
      'shibuya': {
        '1番線': { exit: 'ハチ公口', walkTime: 2, meetingPoint: 'ハチ公前タクシー乗り場', gps: { lat: 35.6580, lng: 139.7016 } },
        '2番線': { exit: '南口', walkTime: 3, meetingPoint: '南口タクシー乗り場', gps: { lat: 35.6575, lng: 139.7020 } },
        'default': { exit: 'ハチ公口', walkTime: 3, meetingPoint: 'タクシー乗り場', gps: { lat: 35.6580, lng: 139.7016 } }
      }
    };

    const stationPickup = pickupPoints[stationId] || pickupPoints['tokyo'];
    return stationPickup[platform] || stationPickup['default'];
  }

  /**
   * Save scheduled booking to local storage
   */
  async saveScheduledBooking(booking) {
    try {
      const existingBookings = await AsyncStorage.getItem('scheduledBookings');
      const bookings = existingBookings ? JSON.parse(existingBookings) : [];

      // Add new booking
      bookings.push(booking);

      // Keep only bookings from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentBookings = bookings.filter(b =>
        new Date(b.createdAt) > oneDayAgo
      );

      await AsyncStorage.setItem('scheduledBookings', JSON.stringify(recentBookings));
      return true;
    } catch (error) {
      console.error('Error saving booking:', error);
      return false;
    }
  }

  /**
   * Get all scheduled bookings
   */
  async getScheduledBookings() {
    try {
      const bookings = await AsyncStorage.getItem('scheduledBookings');
      return bookings ? JSON.parse(bookings) : [];
    } catch (error) {
      console.error('Error loading bookings:', error);
      return [];
    }
  }

  /**
   * Cancel a scheduled booking
   */
  async cancelBooking(bookingId) {
    try {
      // Cancel on backend
      try {
        await fetch(`${BACKEND_URL}/api/bookings/${bookingId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });
      } catch (error) {
        console.log('Backend cancellation failed, removing locally:', error.message);
      }

      // Remove from local storage
      const bookings = await this.getScheduledBookings();
      const filtered = bookings.filter(b => b.bookingId !== bookingId);
      await AsyncStorage.setItem('scheduledBookings', JSON.stringify(filtered));

      return true;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return false;
    }
  }

  /**
   * Format train arrivals for display
   */
  formatTrainArrivals(arrivals) {
    return arrivals.map(arrival => ({
      ...arrival,
      displayTime: this.formatTime(arrival.arrivalTime),
      crowdIcon: this.getCrowdIcon(arrival.crowdLevel),
      statusColor: arrival.status === 'delayed' ? '#ff6b6b' : '#4CAF50'
    }));
  }

  /**
   * Format time for display
   */
  formatTime(isoTime) {
    const date = new Date(isoTime);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get crowd level icon
   */
  getCrowdIcon(level) {
    const icons = {
      'very_high': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[level] || '⚪';
  }

  /**
   * Check if train service is available
   */
  async checkServiceStatus() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/trains/status`, {
        method: 'GET',
        timeout: 3000
      });

      return response.ok;
    } catch (error) {
      console.log('Train service unavailable:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export default new TrainService();
