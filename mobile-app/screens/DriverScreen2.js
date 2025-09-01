import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  Switch,
  Platform
} from 'react-native';
import * as Location from 'expo-location';

// Smart Maps Detection - Works in both Expo Go and Production
let MapView = null;
let Marker = null;
let PROVIDER_GOOGLE = null;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (error) {
  console.log('Maps not available in Expo Go - will work in production build');
}

const DriverScreen = ({ onSwitchMode, onBackToSelection }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 28500,
    rides: 23,
    hours: 8
  });
  const [currentRide, setCurrentRide] = useState(null);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [selectedStation, setSelectedStation] = useState('東京駅');
  const [queuePosition, setQueuePosition] = useState(3);
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    if (isOnline && autoAccept) {
      const timer = setTimeout(() => {
        simulateRideRequest();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, autoAccept]);

  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation.coords);
        setMapRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }
    } catch (error) {
      console.log('Location error:', error);
      // Set default location (Tokyo Station)
      const defaultLocation = { latitude: 35.6812, longitude: 139.7671 };
      setLocation(defaultLocation);
      setMapRegion({
        ...defaultLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const simulateRideRequest = () => {
    const requests = [
      { from: '六本木駅', to: '成城学園前', fare: 3800, distance: '12km', surge: 1.3 },
      { from: '新宿駅', to: '世田谷区', fare: 2400, distance: '7km', surge: 1.0 },
      { from: '渋谷駅', to: '三軒茶屋', fare: 1800, distance: '5km', surge: 1.2 }
    ];
    const randomRequest = requests[Math.floor(Math.random() * requests.length)];
    setCurrentRide({
      ...randomRequest,
      confirmationNumber: Math.floor(1000 + Math.random() * 9000)
    });
    setShowRideRequest(true);
    
    if (autoAccept) {
      setTimeout(() => acceptRide(), 2000);
    }
  };

  const acceptRide = () => {
    setShowRideRequest(false);
    setEarnings(prev => ({
      ...prev,
      today: prev.today + (currentRide?.fare || 0),
      rides: prev.rides + 1
    }));
    Alert.alert('配車確定', `確認番号: ${currentRide?.confirmationNumber}`);
  };

  const stations = ['東京駅', '新宿駅', '渋谷駅', '品川駅', '上野駅', '池袋駅'];

  const recommendations = [
    { area: '六本木エリア', surge: 'x1.3', reason: '雨予報' },
    { area: '羽田空港', surge: 'x1.2', reason: '到着ラッシュ' },
    { area: '東京駅', surge: 'x1.1', reason: '新幹線到着' }
  ];

  // Simple map rendering without heat map
  const renderMap = () => {
    if (MapView && mapRegion) {
      return (
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : null}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {location && (
            <Marker
              coordinate={location}
              title="現在地"
              pinColor={isOnline ? "green" : "gray"}
            />
          )}
        </MapView>
      );
    } else {
      // Simple placeholder when maps not available
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapPlaceholderTitle}>ドライバーマップ</Text>
          <Text style={styles.mapPlaceholderText}>
            {isOnline ? '配車受付中' : 'オフライン'}
          </Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>ドライバーモード</Text>
          <Text style={styles.subtitle}>全国AIタクシー</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>運行状態</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isOnline ? "#4CAF50" : "#f4f3f4"}
            />
          </View>
          <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#999' }]}>
            {isOnline ? 'オンライン - 配車受付中' : 'オフライン'}
          </Text>
        </View>

        <View style={styles.autoAcceptCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>自動受諾</Text>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={autoAccept ? "#2196F3" : "#f4f3f4"}
            />
          </View>
          <Text style={styles.autoAcceptText}>
            {autoAccept ? 'AI最適配車 ON' : 'AI最適配車 OFF'}
          </Text>
        </View>

        {currentRide && (
          <View style={styles.currentRideCard}>
            <Text style={styles.currentRideTitle}>現在の配車</Text>
            <Text style={styles.confirmationNumber}>確認番号: {currentRide.confirmationNumber}</Text>
            <Text style={styles.rideDetails}>
              {currentRide.from} → {currentRide.to}
            </Text>
            <Text style={styles.rideFare}>料金: ¥{currentRide.fare}</Text>
          </View>
        )}

        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>本日の収益</Text>
          <Text style={styles.earningsAmount}>¥{earnings.today.toLocaleString()}</Text>
          <View style={styles.earningsDetails}>
            <View style={styles.earningsStat}>
              <Text style={styles.statValue}>{earnings.rides}</Text>
              <Text style={styles.statLabel}>完了</Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.statValue}>{earnings.hours}h</Text>
              <Text style={styles.statLabel}>稼働</Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.statValue}>¥{Math.round(earnings.today / earnings.hours)}</Text>
              <Text style={styles.statLabel}>時給</Text>
            </View>
          </View>
        </View>

        {/* Simple map without heat map overlay */}
        <View style={styles.mapContainer}>
          {renderMap()}
        </View>

        {/* AI Recommendations as simple list instead of heat map */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>AI推奨エリア</Text>
          {recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <View style={styles.recommendationLeft}>
                <Text style={styles.recommendationArea}>{rec.area}</Text>
                <Text style={styles.recommendationReason}>{rec.reason}</Text>
              </View>
              <Text style={styles.recommendationSurge}>{rec.surge}</Text>
            </View>
          ))}
        </View>

        <View style={styles.stationCard}>
          <Text style={styles.stationTitle}>駅待機場所</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {stations.map((station, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.stationButton,
                  selectedStation === station && styles.stationButtonActive
                ]}
                onPress={() => {
                  setSelectedStation(station);
                  setQueuePosition(Math.floor(Math.random() * 10) + 1);
                }}
              >
                <Text style={[
                  styles.stationText,
                  selectedStation === station && styles.stationTextActive
                ]}>
                  {station}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedStation && (
            <Text style={styles.queueText}>
              {selectedStation}待機中 - {queuePosition}番目
            </Text>
          )}
        </View>

        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>GO比較</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>手数料率</Text>
            <Text style={styles.comparisonValue}>15% (GOは25%)</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>月収差額</Text>
            <Text style={styles.comparisonValueHighlight}>+¥50,000/月</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.switchButton} onPress={onSwitchMode}>
            <Text style={styles.switchButtonText}>お客様モードに切り替え</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
            <Text style={styles.backButtonText}>モード選択に戻る</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showRideRequest}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>新規配車リクエスト</Text>
              {currentRide && (
                <>
                  <Text style={styles.modalRoute}>
                    {currentRide.from} → {currentRide.to}
                  </Text>
                  <Text style={styles.modalDistance}>距離: {currentRide.distance}</Text>
                  <Text style={styles.modalFare}>予想料金: ¥{currentRide.fare}</Text>
                  {currentRide.surge > 1 && (
                    <Text style={styles.modalSurge}>サージ: x{currentRide.surge}</Text>
                  )}
                </>
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => setShowRideRequest(false)}
                >
                  <Text style={styles.rejectButtonText}>拒否</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={acceptRide}
                >
                  <Text style={styles.acceptButtonText}>受諾</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ff6b6b',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginTop: 5,
  },
  autoAcceptCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  autoAcceptText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  currentRideCard: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  currentRideTitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  confirmationNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
  rideDetails: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  },
  rideFare: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
  earningsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earningsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  earningsStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  mapContainer: {
    height: 200,
    margin: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e8f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 50,
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recommendationLeft: {
    flex: 1,
  },
  recommendationArea: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recommendationSurge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  stationCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stationButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  stationButtonActive: {
    backgroundColor: '#2196F3',
  },
  stationText: {
    fontSize: 14,
    color: '#666',
  },
  stationTextActive: {
    color: 'white',
  },
  queueText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  comparisonCard: {
    backgroundColor: '#fff3cd',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  comparisonValueHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  buttonContainer: {
    margin: 15,
  },
  switchButton: {
    backgroundColor: '#667eea',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalRoute: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDistance: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalFare: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalSurge: {
    fontSize: 14,
    color: '#ff6b6b',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  rejectButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 20,
    marginLeft: 10,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default DriverScreen;