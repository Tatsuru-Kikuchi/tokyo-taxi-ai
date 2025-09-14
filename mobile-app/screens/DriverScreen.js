import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
  Alert,
  Platform,
  SafeAreaView,
  WebView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// Backend URL
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';

export default function DriverScreen({ onModeChange, onBack }) {
  const [isIPad] = useState(Platform.isPad);
  const [isOnline, setIsOnline] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [dailyEarnings, setDailyEarnings] = useState(28500);
  const [totalRides, setTotalRides] = useState(12);
  const [averageRating, setAverageRating] = useState(4.8);
  const [autoAccept, setAutoAccept] = useState(false);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [showDemandMap, setShowDemandMap] = useState(false);
  const [currentRideRequest, setCurrentRideRequest] = useState(null);

  useEffect(() => {
    initializeLocation();
    if (isOnline) {
      simulateRideRequests();
    }
  }, [isOnline]);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報', '位置情報のアクセス許可が必要です');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('Driver location:', location.coords);

      // Update driver location on backend
      updateDriverLocation(location.coords);
    } catch (error) {
      console.log('Location error:', error);
      // Use Nagoya as fallback for demo
      const fallbackLocation = {
        latitude: 35.181770,
        longitude: 136.906398
      };
      setUserLocation(fallbackLocation);
      updateDriverLocation(fallbackLocation);
    }
  };

  const updateDriverLocation = async (coords) => {
    try {
      await fetch(`${BACKEND_URL}/api/drivers/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_id: 'driver_001',
          latitude: coords.latitude,
          longitude: coords.longitude,
          is_online: isOnline
        })
      });
      console.log('Driver location updated');
    } catch (error) {
      console.log('Location update error:', error.message);
    }
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (userLocation) {
      updateDriverLocation(userLocation);
    }

    if (newStatus) {
      Alert.alert('オンライン', 'ドライバーモードがオンになりました');
    } else {
      Alert.alert('オフライン', 'ドライバーモードがオフになりました');
    }
  };

  const simulateRideRequests = () => {
    if (!isOnline) return;

    // Simulate random ride requests
    const timeout = Math.random() * 30000 + 10000; // 10-40 seconds

    setTimeout(() => {
      if (isOnline) {
        const requests = [
          {
            id: 'req_001',
            pickup_location: '名古屋駅',
            pickup_address: '愛知県名古屋市中村区名駅',
            destination: '栄駅',
            estimated_fare: 1800,
            distance: 3.2,
            customer_name: '田中様',
            estimated_time: 8
          },
          {
            id: 'req_002',
            pickup_location: '金山駅',
            pickup_address: '愛知県名古屋市中区金山',
            destination: '名古屋空港',
            estimated_fare: 4500,
            distance: 12.5,
            customer_name: '佐藤様',
            estimated_time: 25
          },
          {
            id: 'req_003',
            pickup_location: '栄駅',
            pickup_address: '愛知県名古屋市中区栄',
            destination: '覚王山',
            estimated_fare: 2200,
            distance: 4.1,
            customer_name: '山田様',
            estimated_time: 12
          }
        ];

        const randomRequest = requests[Math.floor(Math.random() * requests.length)];
        setCurrentRideRequest(randomRequest);
        setShowRideRequest(true);

        // Auto-accept if enabled
        if (autoAccept) {
          setTimeout(() => acceptRide(randomRequest), 1000);
        }

        // Continue simulation
        simulateRideRequests();
      }
    }, timeout);
  };

  const acceptRide = (request) => {
    console.log('Accepting ride:', request.id);
    setShowRideRequest(false);
    setCurrentRideRequest(null);

    // Update earnings
    setDailyEarnings(prev => prev + request.estimated_fare);
    setTotalRides(prev => prev + 1);

    Alert.alert(
      '配車受付',
      `${request.customer_name}の配車を受け付けました。\n料金: ¥${request.estimated_fare.toLocaleString()}`,
      [{ text: 'OK' }]
    );
  };

  const declineRide = () => {
    console.log('Declining ride');
    setShowRideRequest(false);
    setCurrentRideRequest(null);
  };

  const generateDemandMapHTML = () => {
    const mapboxApiKey = 'pk.eyJ1IjoidGF0c3VydS1raWt1Y2hpIiwiYSI6ImNtZmdrOWNuNDAxcHMya3E0Z3F6ZzR6ODYifQ.DgYnz9Iwp6SBEK_AXeAEWg';

    const center = userLocation ?
      [userLocation.longitude, userLocation.latitude] :
      [136.906398, 35.181770]; // Nagoya fallback

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8' />
        <title>需要マップ</title>
        <meta name='viewport' content='initial-scale=1,maximum-scale=1,user-scalable=no' />
        <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
        <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
        <style>
            body { margin: 0; padding: 0; font-family: sans-serif; }
            #map { position: absolute; top: 0; bottom: 0; width: 100%; }
            .legend {
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(255,255,255,0.9);
                padding: 15px;
                border-radius: 8px;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
            }
            .legend-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            .legend-color {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                margin-right: 8px;
            }
            .high-demand { background-color: #FF4444; }
            .medium-demand { background-color: #FF9800; }
            .your-location { background-color: #00C853; }
        </style>
    </head>
    <body>
        <div id='map'></div>
        <div class='legend'>
            <div class='legend-item'>
                <div class='legend-color high-demand'></div>
                <span>高需要エリア (¥3,500/時)</span>
            </div>
            <div class='legend-item'>
                <div class='legend-color medium-demand'></div>
                <span>中需要エリア (¥2,800/時)</span>
            </div>
            <div class='legend-item'>
                <div class='legend-color your-location'></div>
                <span>あなたの位置</span>
            </div>
        </div>

        <script>
            mapboxgl.accessToken = '${mapboxApiKey}';

            const map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [${center[0]}, ${center[1]}],
                zoom: 12
            });

            map.on('load', function() {
                // High demand areas (red circles)
                const highDemandAreas = [
                    { center: [136.906398, 35.181770], name: '名古屋駅周辺' },
                    { center: [136.908245, 35.168058], name: '栄エリア' },
                    { center: [136.900656, 35.143033], name: '金山駅周辺' }
                ];

                // Medium demand areas (orange circles)
                const mediumDemandAreas = [
                    { center: [136.931411, 35.166584], name: '千種エリア' },
                    { center: [136.928358, 35.184089], name: '大曽根エリア' },
                    { center: [136.875656, 35.195033], name: '中村区役所前' }
                ];

                // Add high demand markers
                highDemandAreas.forEach(area => {
                    // Add demand circle
                    new mapboxgl.Marker({
                        color: '#FF4444',
                        scale: 0.8
                    })
                    .setLngLat(area.center)
                    .setPopup(new mapboxgl.Popup().setHTML(
                        '<h3>' + area.name + '</h3>' +
                        '<p>需要レベル: <strong>高</strong></p>' +
                        '<p>予想収入: <strong>¥3,500/時</strong></p>' +
                        '<p>待機中の乗客: <strong>8人</strong></p>'
                    ))
                    .addTo(map);
                });

                // Add medium demand markers
                mediumDemandAreas.forEach(area => {
                    new mapboxgl.Marker({
                        color: '#FF9800',
                        scale: 0.6
                    })
                    .setLngLat(area.center)
                    .setPopup(new mapboxgl.Popup().setHTML(
                        '<h3>' + area.name + '</h3>' +
                        '<p>需要レベル: <strong>中</strong></p>' +
                        '<p>予想収入: <strong>¥2,800/時</strong></p>' +
                        '<p>待機中の乗客: <strong>3人</strong></p>'
                    ))
                    .addTo(map);
                });

                // Add your location
                new mapboxgl.Marker({
                    color: '#00C853',
                    scale: 1.0
                })
                .setLngLat([${center[0]}, ${center[1]}])
                .setPopup(new mapboxgl.Popup().setHTML(
                    '<h3>あなたの現在地</h3>' +
                    '<p>オンライン状態: <strong>${isOnline ? 'オン' : 'オフ'}</strong></p>' +
                    '<p>本日の収入: <strong>¥${dailyEarnings.toLocaleString()}</strong></p>'
                ))
                .addTo(map);
            });
        </script>
    </body>
    </html>
    `;
  };

  const renderStatsCard = () => (
    <View style={[styles.card, isIPad && styles.cardIPad]}>
      <Text style={[styles.cardTitle, isIPad && styles.cardTitleIPad]}>今日の実績</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, isIPad && styles.statValueIPad]}>
            ¥{dailyEarnings.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>売上</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, isIPad && styles.statValueIPad]}>
            {totalRides}
          </Text>
          <Text style={styles.statLabel}>配車回数</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, isIPad && styles.statValueIPad]}>
            {averageRating}
          </Text>
          <Text style={styles.statLabel}>評価</Text>
        </View>
      </View>
    </View>
  );

  const renderOnlineCard = () => (
    <View style={[styles.card, isIPad && styles.cardIPad]}>
      <View style={styles.onlineHeader}>
        <Text style={[styles.cardTitle, isIPad && styles.cardTitleIPad]}>
          ドライバーステータス
        </Text>
        <Switch
          value={isOnline}
          onValueChange={toggleOnlineStatus}
          trackColor={{ false: '#C7C7CC', true: '#34C759' }}
          thumbColor={isOnline ? '#FFFFFF' : '#F4F3F4'}
        />
      </View>

      <Text style={styles.onlineStatus}>
        {isOnline ? '🟢 オンライン - 配車受付中' : '🔴 オフライン'}
      </Text>

      {isOnline && (
        <View style={styles.autoAcceptContainer}>
          <Text style={styles.autoAcceptLabel}>自動受付</Text>
          <Switch
            value={autoAccept}
            onValueChange={setAutoAccept}
            trackColor={{ false: '#C7C7CC', true: '#007AFF' }}
            thumbColor={autoAccept ? '#FFFFFF' : '#F4F3F4'}
          />
        </View>
      )}
    </View>
  );

  const renderAIRecommendations = () => (
    <View style={[styles.card, isIPad && styles.cardIPad]}>
      <Text style={[styles.cardTitle, isIPad && styles.cardTitleIPad]}>
        AI需要予測
      </Text>

      <View style={styles.recommendationItem}>
        <View style={styles.recommendationHeader}>
          <Text style={[styles.recommendationTitle, isIPad && styles.recommendationTitleIPad]}>
            🔥 名古屋駅周辺
          </Text>
          <Text style={[styles.demandLevel, styles.highDemand, isIPad && styles.demandLevelIPad]}>
            需要：高
          </Text>
        </View>
        <Text style={styles.recommendationText}>
          ビジネス街での会議終了時間。予想収入: ¥3,500/時
        </Text>
      </View>

      <View style={styles.recommendationItem}>
        <View style={styles.recommendationHeader}>
          <Text style={[styles.recommendationTitle, isIPad && styles.recommendationTitleIPad]}>
            📍 栄エリア
          </Text>
          <Text style={[styles.demandLevel, styles.mediumDemand, isIPad && styles.demandLevelIPad]}>
            需要：中
          </Text>
        </View>
        <Text style={styles.recommendationText}>
          ショッピングエリア。予想収入: ¥2,800/時
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.demandMapButton, isIPad && styles.demandMapButtonIPad]}
        onPress={() => setShowDemandMap(true)}
      >
        <Ionicons name="map" size={isIPad ? 24 : 20} color="#007AFF" />
        <Text style={[styles.demandMapButtonText, isIPad && styles.demandMapButtonTextIPad]}>
          需要マップを表示
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGoComparison = () => (
    <View style={[styles.card, isIPad && styles.cardIPad, styles.comparisonCard]}>
      <Text style={[styles.cardTitle, isIPad && styles.cardTitleIPad]}>
        手数料比較
      </Text>

      <View style={styles.comparisonRow}>
        <View style={styles.comparisonItem}>
          <Text style={[styles.comparisonLabel, isIPad && styles.comparisonLabelIPad]}>
            全国AIタクシー
          </Text>
          <Text style={[styles.comparisonValue, styles.ourRate, isIPad && styles.comparisonValueIPad]}>
            15%
          </Text>
        </View>

        <View style={styles.comparisonVs}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.comparisonItem}>
          <Text style={[styles.comparisonLabel, isIPad && styles.comparisonLabelIPad]}>
            GO
          </Text>
          <Text style={[styles.comparisonValue, styles.competitorRate, isIPad && styles.comparisonValueIPad]}>
            25%
          </Text>
        </View>
      </View>

      <Text style={[styles.savingsText, isIPad && styles.savingsTextIPad]}>
        月間 ¥50,000の売上で ¥5,000 お得！
      </Text>
    </View>
  );

  const renderRideRequestModal = () => (
    <Modal
      visible={showRideRequest}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.rideRequestModal, isIPad && styles.rideRequestModalIPad]}>
          <Text style={[styles.modalTitle, isIPad && styles.modalTitleIPad]}>
            配車リクエスト
          </Text>

          {currentRideRequest && (
            <View style={styles.requestDetails}>
              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>乗客</Text>
                <Text style={[styles.requestValue, isIPad && styles.requestValueIPad]}>
                  {currentRideRequest.customer_name}
                </Text>
              </View>

              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>乗車地</Text>
                <Text style={[styles.requestValue, isIPad && styles.requestValueIPad]}>
                  {currentRideRequest.pickup_location}
                </Text>
              </View>

              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>目的地</Text>
                <Text style={[styles.requestValue, isIPad && styles.requestValueIPad]}>
                  {currentRideRequest.destination}
                </Text>
              </View>

              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>予想料金</Text>
                <Text style={[styles.requestValue, styles.fareValue, isIPad && styles.requestValueIPad]}>
                  ¥{currentRideRequest.estimated_fare.toLocaleString()}
                </Text>
              </View>

              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>距離・時間</Text>
                <Text style={[styles.requestValue, isIPad && styles.requestValueIPad]}>
                  {currentRideRequest.distance}km • {currentRideRequest.estimated_time}分
                </Text>
              </View>
            </View>
          )}

          <View style={styles.requestButtons}>
            <TouchableOpacity
              style={[styles.declineButton, isIPad && styles.requestButtonIPad]}
              onPress={declineRide}
            >
              <Text style={[styles.declineButtonText, isIPad && styles.requestButtonTextIPad]}>
                辞退
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, isIPad && styles.requestButtonIPad]}
              onPress={() => acceptRide(currentRideRequest)}
            >
              <Text style={[styles.acceptButtonText, isIPad && styles.requestButtonTextIPad]}>
                受付
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDemandMapModal = () => (
    <Modal
      visible={showDemandMap}
      transparent={false}
      animationType="slide"
    >
      <SafeAreaView style={styles.mapModalContainer}>
        <View style={[styles.mapHeader, isIPad && styles.mapHeaderIPad]}>
          <TouchableOpacity onPress={() => setShowDemandMap(false)}>
            <Ionicons name="close" size={isIPad ? 32 : 24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={[styles.mapTitle, isIPad && styles.mapTitleIPad]}>
            需要マップ
          </Text>
          <View style={{ width: isIPad ? 32 : 24 }} />
        </View>

        <WebView
          source={{ html: generateDemandMapHTML() }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, isIPad && styles.containerIPad]}>
      <View style={[styles.header, isIPad && styles.headerIPad]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={isIPad ? 32 : 24} color="#007AFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isIPad && styles.headerTitleIPad]}>
          ドライバー
        </Text>

        <TouchableOpacity onPress={() => onModeChange('customer')} style={styles.switchButton}>
          <Text style={[styles.switchButtonText, isIPad && styles.switchButtonTextIPad]}>
            乗客
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderOnlineCard()}
        {renderStatsCard()}
        {renderAIRecommendations()}
        {renderGoComparison()}
      </ScrollView>

      {renderRideRequestModal()}
      {renderDemandMapModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerIPad: {
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerIPad: {
    paddingHorizontal: 40,
    paddingVertical: 25,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  headerTitleIPad: {
    fontSize: 24,
  },
  switchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  switchButtonTextIPad: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIPad: {
    padding: 30,
    borderRadius: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  cardTitleIPad: {
    fontSize: 24,
    marginBottom: 24,
  },
  onlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  onlineStatus: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  autoAcceptContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoAcceptLabel: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statValueIPad: {
    fontSize: 32,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  recommendationItem: {
    marginBottom: 16,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  recommendationTitleIPad: {
    fontSize: 20,
  },
  demandLevel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demandLevelIPad: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  highDemand: {
    backgroundColor: '#FFE5E5',
    color: '#D32F2F',
  },
  mediumDemand: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  recommendationText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  demandMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  demandMapButtonIPad: {
    padding: 18,
    borderRadius: 12,
  },
  demandMapButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  demandMapButtonTextIPad: {
    fontSize: 20,
  },
  comparisonCard: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonVs: {
    marginHorizontal: 20,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
  },
  comparisonLabelIPad: {
    fontSize: 18,
  },
  comparisonValue: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  comparisonValueIPad: {
    fontSize: 36,
  },
  ourRate: {
    color: '#34C759',
  },
  competitorRate: {
    color: '#FF3B30',
  },
  savingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  savingsTextIPad: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rideRequestModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  rideRequestModalIPad: {
    padding: 40,
    maxWidth: 600,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalTitleIPad: {
    fontSize: 28,
  },
  requestDetails: {
    marginBottom: 24,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  requestLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  requestValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  requestValueIPad: {
    fontSize: 20,
  },
  fareValue: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    marginLeft: 8,
    alignItems: 'center',
  },
  requestButtonIPad: {
    paddingVertical: 24,
    borderRadius: 16,
  },
  declineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  requestButtonTextIPad: {
    fontSize: 20,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  mapHeaderIPad: {
    paddingHorizontal: 40,
    paddingVertical: 25,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  mapTitleIPad: {
    fontSize: 24,
  },
  webView: {
    flex: 1,
  },
});
