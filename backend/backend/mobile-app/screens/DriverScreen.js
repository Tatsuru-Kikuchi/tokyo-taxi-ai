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
  Dimensions,
  Platform
} from 'react-native';
import * as Location from 'expo-location';

// Get screen dimensions for iPad compatibility
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const DriverScreen = ({ onSwitchMode, onBackToSelection }) => {
  // Default props to prevent undefined crashes
  const handleSwitchMode = onSwitchMode || (() => console.log('Switch mode'));
  const handleBackToSelection = onBackToSelection || (() => console.log('Back'));

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

  useEffect(() => {
    if (isOnline && autoAccept) {
      const timer = setTimeout(() => {
        simulateRideRequest();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, autoAccept]);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setLocation(location.coords);
        }
      } catch (error) {
        console.log('Location error:', error);
        // Set default location for testing
        setLocation({ latitude: 35.6812, longitude: 139.7671 });
      }
    })();
  }, []);

  const simulateRideRequest = () => {
    const requests = [
      { from: '六本木', to: '羽田空港', fare: 5800, distance: '18km', surge: 1.2 },
      { from: '新宿駅', to: '東京駅', fare: 2400, distance: '7km', surge: 1.0 },
      { from: '渋谷', to: '品川', fare: 2100, distance: '6km', surge: 1.1 }
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

  const MapComponent = () => {
    return (
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>🗺️ AIホットスポットマップ</Text>
          <Text style={styles.mapSubtitle}>高需要エリア表示中</Text>
        </View>
        <View style={styles.hotspotGrid}>
          {recommendations.map((rec, index) => (
            <View key={index} style={styles.hotspotCard}>
              <Text style={styles.hotspotEmoji}>📍</Text>
              <Text style={styles.hotspotArea}>{rec.area}</Text>
              <Text style={styles.hotspotSurge}>{rec.surge}</Text>
              <Text style={styles.hotspotReason}>{rec.reason}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isTablet && styles.containerTablet]}>
      <ScrollView contentContainerStyle={isTablet && styles.scrollViewTablet}>
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <View style={styles.header}>
            <Text style={styles.title}>ドライバーモード</Text>
            <Text style={styles.subtitle}>全国AIタクシー</Text>
          </View>

          <View style={[styles.statusCard, isTablet && styles.cardTablet]}>
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

          <View style={[styles.autoAcceptCard, isTablet && styles.cardTablet]}>
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
            <View style={[styles.currentRideCard, isTablet && styles.cardTablet]}>
              <Text style={styles.currentRideTitle}>現在の配車</Text>
              <Text style={styles.confirmationNumber}>確認番号: {currentRide.confirmationNumber}</Text>
              <Text style={styles.rideDetails}>
                {currentRide.from} → {currentRide.to}
              </Text>
              <Text style={styles.rideFare}>料金: ¥{currentRide.fare}</Text>
            </View>
          )}

          <View style={[styles.earningsCard, isTablet && styles.cardTablet]}>
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

          <View style={[styles.mapContainer, isTablet && styles.mapContainerTablet]}>
            <MapComponent />
          </View>

          <View style={[styles.stationCard, isTablet && styles.cardTablet]}>
            <Text style={styles.stationTitle}>駅待機場所</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stationScroll}>
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

          <View style={[styles.recommendationsCard, isTablet && styles.cardTablet]}>
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

          <View style={[styles.comparisonCard, isTablet && styles.cardTablet]}>
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
            <TouchableOpacity style={styles.switchButton} onPress={handleSwitchMode}>
              <Text style={styles.switchButtonText}>お客様モードに切り替え</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={handleBackToSelection}>
              <Text style={styles.backButtonText}>モード選択に戻る</Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={showRideRequest}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.modalContainer}>
              <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerTablet: {
    backgroundColor: '#f0f0f0',
  },
  scrollViewTablet: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  content: {
    flex: 1,
  },
  contentTablet: {
    width: '100%',
    maxWidth: 768,
    paddingHorizontal: 20,
  },
  cardTablet: {
    marginHorizontal: 0,
  },
  header: {
    backgroundColor: '#ff6b6b',
    padding: 20,
    alignItems: 'center',
    borderRadius: isTablet ? 10 : 0,
    marginBottom: isTablet ? 20 : 0,
  },
  title: {
    fontSize: isTablet ? 28 : 24,
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
    fontSize: isTablet ? 36 : 32,
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
  mapContainerTablet: {
    height: 300,
    marginHorizontal: 0,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e8f4f8',
    padding: 15,
  },
  mapHeader: {
    marginBottom: 15,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  mapSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  hotspotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hotspotCard: {
    width: isTablet ? '31%' : '30%',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  hotspotEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  hotspotArea: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  hotspotSurge: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: 'bold',
    marginTop: 2,
  },
  hotspotReason: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
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
  stationScroll: {
    maxHeight: 50,
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
    fontSize: isTablet ? 18 : 16,
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
  modalContentTablet: {
    width: '60%',
    maxWidth: 500,
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
