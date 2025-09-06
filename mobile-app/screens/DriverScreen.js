import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  SafeAreaView,
  Switch,
  Platform,
  FlatList,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import allStationsData from '../data/all_japan_stations.json';

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const STATION_DATA = allStationsData;

export default function DriverScreen({ onModeChange, onBack }) {
  const [isOnline, setIsOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [showRideModal, setShowRideModal] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 28500,
    week: 142000,
    month: 580000,
    hours: 8,
    rides: 23
  });
  const [location, setLocation] = useState(null);
  const [autoAccept, setAutoAccept] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showStationModal, setShowStationModal] = useState(false);
  const [driverStats, setDriverStats] = useState({
    rating: 4.9,
    completionRate: 98,
    totalRides: 1847
  });
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [filteredStations, setFilteredStations] = useState([]);
  const [showDemandMap, setShowDemandMap] = useState(false);

  const hotspots = [
    { name: '六本木', demand: '高', time: '22:00-02:00', lat: 35.6641, lng: 139.7294 },
    { name: '新橋', demand: '中', time: '18:00-21:00', lat: 35.6657, lng: 139.7516 },
    { name: '羽田空港', demand: '高', time: '06:00-09:00', lat: 35.5494, lng: 139.7798 },
  ];

  useEffect(() => {
    requestLocationPermission();
    if (isOnline) {
      simulateRideRequests();
    }
  }, [isOnline]);

  useEffect(() => {
    if (location && STATION_DATA.length > 0) {
      loadNearbyStations();
    }
  }, [location]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const locationData = await Location.getCurrentPositionAsync({});
        setLocation(locationData.coords);
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const loadNearbyStations = () => {
    if (!location || !STATION_DATA) return;

    const nearby = STATION_DATA
      .map(station => ({
        ...station,
        distance: Math.sqrt(
          Math.pow(station.lat - location.latitude, 2) +
          Math.pow(station.lng - location.longitude, 2)
        ) * 111000
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    setFilteredStations(nearby);
  };

  const searchStations = (query) => {
    setStationSearchQuery(query);

    if (query.length === 0) {
      loadNearbyStations();
      return;
    }

    const filtered = STATION_DATA
      .filter(station =>
        station.name?.includes(query) ||
        station.nameEn?.toLowerCase().includes(query.toLowerCase()) ||
        station.prefecture?.includes(query)
      )
      .slice(0, 50);

    setFilteredStations(filtered);
  };

  const simulateRideRequests = () => {
    const interval = setInterval(() => {
      if (isOnline && !currentRide && Math.random() > 0.7) {
        const nearbyStation = filteredStations[0] || { name: '東京駅' };
        const destinations = ['六本木', '渋谷', '新宿', '品川', '銀座'];
        const mockRide = {
          id: Date.now(),
          pickup: nearbyStation.name,
          dropoff: destinations[Math.floor(Math.random() * destinations.length)],
          distance: `${(Math.random() * 10 + 2).toFixed(1)}km`,
          fare: Math.floor(Math.random() * 3000 + 1500),
          customerName: '山田様',
          estimatedTime: Math.floor(Math.random() * 20 + 10)
        };

        if (autoAccept) {
          acceptRide(mockRide);
        } else {
          setCurrentRide(mockRide);
          setShowRideModal(true);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  };

  const acceptRide = (ride) => {
    setCurrentRide(ride);
    setShowRideModal(false);
    Alert.alert('配車確定', `${ride.pickup}から${ride.dropoff}への配車を受け付けました`);
  };

  const declineRide = () => {
    setCurrentRide(null);
    setShowRideModal(false);
  };

  const completeRide = () => {
    if (currentRide) {
      setEarnings(prev => ({
        ...prev,
        today: prev.today + currentRide.fare,
        rides: prev.rides + 1
      }));
      Alert.alert('運行完了', `¥${currentRide.fare}を獲得しました`);
      setCurrentRide(null);
    }
  };

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      Alert.alert('オンライン', '配車リクエストの受付を開始しました');
    } else {
      Alert.alert('オフライン', '配車リクエストの受付を停止しました');
    }
  };

  // Simple demand visualization without map dependencies
  const renderDemandVisualization = () => (
    <View style={styles.demandContainer}>
      <View style={styles.demandHeader}>
        <Ionicons name="flame" size={24} color="#ff6b6b" />
        <Text style={styles.demandTitle}>AI需要予測エリア</Text>
      </View>

      <View style={styles.demandGrid}>
        {hotspots.map((spot, index) => (
          <View key={index} style={styles.demandCard}>
            <View style={styles.demandCardHeader}>
              <Text style={styles.demandEmoji}>
                {spot.demand === '高' ? '🔴' : '🟡'}
              </Text>
              <Text style={styles.demandLevel}>需要: {spot.demand}</Text>
            </View>
            <Text style={styles.demandLocation}>{spot.name}</Text>
            <Text style={styles.demandTime}>{spot.time}</Text>
            <View style={styles.demandStats}>
              <Text style={styles.demandStatText}>
                予想収益: ¥{spot.demand === '高' ? '4,500/時' : '3,200/時'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {location && (
        <View style={styles.currentLocationCard}>
          <Ionicons name="location" size={20} color="#4285F4" />
          <Text style={styles.currentLocationText}>
            現在地から最も近い高需要エリア: {hotspots[0].name}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onBack && onBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ドライバーモード</Text>
        <View style={styles.onlineToggle}>
          <Text style={styles.onlineText}>{isOnline ? 'オンライン' : 'オフライン'}</Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={isOnline ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Demand Map Toggle */}
        <TouchableOpacity
          style={styles.mapToggleCard}
          onPress={() => setShowDemandMap(!showDemandMap)}
        >
          <View style={styles.mapToggleHeader}>
            <Ionicons name="map" size={24} color="#ff6b6b" />
            <Text style={styles.mapToggleTitle}>AI需要予測マップ</Text>
            <Ionicons name={showDemandMap ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {showDemandMap && renderDemandVisualization()}

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.cardTitle}>本日の収益</Text>
          <Text style={styles.earningsAmount}>¥{earnings.today.toLocaleString()}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnings.rides}</Text>
              <Text style={styles.statLabel}>配車</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{Math.round(earnings.today / earnings.hours)}</Text>
              <Text style={styles.statLabel}>時給</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnings.hours}h</Text>
              <Text style={styles.statLabel}>稼働時間</Text>
            </View>
          </View>
        </View>

        {/* Current Ride Card */}
        {currentRide && (
          <View style={styles.currentRideCard}>
            <Text style={styles.cardTitle}>現在の配車</Text>
            <View style={styles.rideInfo}>
              <View style={styles.rideRow}>
                <Ionicons name="location" size={20} color="#4CAF50" />
                <Text style={styles.rideText}>乗車: {currentRide.pickup}</Text>
              </View>
              <View style={styles.rideRow}>
                <Ionicons name="flag" size={20} color="#FF6347" />
                <Text style={styles.rideText}>降車: {currentRide.dropoff}</Text>
              </View>
              <View style={styles.rideRow}>
                <Ionicons name="cash" size={20} color="#FFD700" />
                <Text style={styles.rideText}>料金: ¥{currentRide.fare}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.completeButton} onPress={completeRide}>
              <Text style={styles.completeButtonText}>運行完了</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Auto Accept Setting */}
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>自動受付</Text>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
            />
          </View>
          <Text style={styles.settingDescription}>
            配車リクエストを自動的に受け付けます
          </Text>
        </View>

        {/* Station Queue */}
        <View style={styles.stationCard}>
          <Text style={styles.cardTitle}>駅待機列</Text>
          <TouchableOpacity
            style={styles.stationSelector}
            onPress={() => {
              setShowStationModal(true);
              if (filteredStations.length === 0) {
                loadNearbyStations();
              }
            }}
          >
            <Text style={styles.stationSelectorText}>
              {selectedStation ?
                `${selectedStation.name} (${selectedStation.prefecture})` :
                '駅を選択'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          {selectedStation && (
            <Text style={styles.queueInfo}>
              待機順位: {Math.floor(Math.random() * 10) + 1}番目
            </Text>
          )}
        </View>

        {/* AI Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.cardTitle}>AI需要予測</Text>
          {hotspots.map((spot, index) => (
            <View key={index} style={styles.hotspotItem}>
              <View style={styles.hotspotInfo}>
                <Text style={styles.hotspotName}>{spot.name}</Text>
                <Text style={styles.hotspotTime}>{spot.time}</Text>
              </View>
              <View style={[styles.demandBadge, spot.demand === '高' ? styles.highDemand : styles.mediumDemand]}>
                <Text style={styles.demandText}>{spot.demand}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Driver Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>パフォーマンス</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{driverStats.rating}</Text>
              <Text style={styles.performanceLabel}>評価</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{driverStats.completionRate}%</Text>
              <Text style={styles.performanceLabel}>完了率</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{driverStats.totalRides}</Text>
              <Text style={styles.performanceLabel}>総配車数</Text>
            </View>
          </View>
        </View>

        {/* Mode Switch Button */}
        <TouchableOpacity
          style={styles.modeSwitchButton}
          onPress={() => onModeChange && onModeChange('customer')}
        >
          <Ionicons name="person" size={24} color="white" />
          <Text style={styles.modeSwitchButtonText}>お客様モードに切り替え</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Ride Request Modal */}
      <Modal
        visible={showRideModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新規配車リクエスト</Text>
            {currentRide && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>乗車地点:</Text>
                  <Text style={styles.modalValue}>{currentRide.pickup}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>降車地点:</Text>
                  <Text style={styles.modalValue}>{currentRide.dropoff}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>予想料金:</Text>
                  <Text style={styles.modalValue}>¥{currentRide.fare}</Text>
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.acceptButton]}
                    onPress={() => acceptRide(currentRide)}
                  >
                    <Text style={styles.acceptButtonText}>受付</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.declineButton]}
                    onPress={declineRide}
                  >
                    <Text style={styles.declineButtonText}>拒否</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Station Selection Modal */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>駅を選択</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowStationModal(false);
                  setStationSearchQuery('');
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="駅名・都道府県で検索"
                value={stationSearchQuery}
                onChangeText={searchStations}
              />
            </View>

            {location && stationSearchQuery === '' && (
              <View style={styles.nearbySection}>
                <Text style={styles.nearbySectionTitle}>📍 近くの駅</Text>
              </View>
            )}

            <FlatList
              data={filteredStations}
              keyExtractor={(item) => item.id.toString()}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stationOption}
                  onPress={() => {
                    setSelectedStation(item);
                    setShowStationModal(false);
                    setStationSearchQuery('');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stationOptionName}>{item.name}</Text>
                    <Text style={styles.stationOptionDetails}>
                      {item.prefecture} • {item.lines?.join(', ') || '不明'}
                    </Text>
                  </View>
                  {item.distance && (
                    <Text style={styles.stationDistance}>
                      {item.distance < 1000 ?
                        `${Math.round(item.distance)}m` :
                        `${(item.distance / 1000).toFixed(1)}km`}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ff6b6b',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    color: 'white',
    marginRight: 10,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  mapToggleCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapToggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
    color: '#333',
  },
  demandContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  demandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  demandTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  demandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  demandCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    width: '48%',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  demandCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  demandEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  demandLevel: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  demandLocation: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  demandTime: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
  },
  demandStats: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 5,
  },
  demandStatText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  currentLocationText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  earningsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  currentRideCard: {
    backgroundColor: '#FFF8DC',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  rideInfo: {
    marginVertical: 10,
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  rideText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  stationCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  stationSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  stationSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  queueInfo: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  recommendationsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  hotspotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hotspotInfo: {
    flex: 1,
  },
  hotspotName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  hotspotTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  demandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highDemand: {
    backgroundColor: '#ffebee',
  },
  mediumDemand: {
    backgroundColor: '#fff3e0',
  },
  demandText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  modeSwitchButton: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  modeSwitchButtonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    padding: 5,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  declineButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  nearbySection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff8dc',
  },
  nearbySectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  stationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stationOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stationOptionDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  stationDistance: {
    fontSize: 14,
    color: '#999',
  },
});
