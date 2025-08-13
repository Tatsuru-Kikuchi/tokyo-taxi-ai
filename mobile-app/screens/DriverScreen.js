import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import io from 'socket.io-client';

// CHANGE THIS TO YOUR PRODUCTION URL
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';

export default function DriverScreen({ onSwitchMode }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(false);
  const [location, setLocation] = useState(null);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [prefecture, setPrefecture] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  const [earnings, setEarnings] = useState(0);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [highDemandStations, setHighDemandStations] = useState([]);
  const [showMap, setShowMap] = useState(true);
  const [ridesCompleted, setRidesCompleted] = useState(0);
  const [locationWatcher, setLocationWatcher] = useState(null);

  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (socket) socket.close();
      if (locationWatcher) locationWatcher.remove();
    };
  }, []);

  useEffect(() => {
    if (location) {
      detectUserRegion();
      connectToBackend();
      fetchRegionalWeatherInfo();
    }
  }, [location]);

  useEffect(() => {
    if (online && location && currentRegion) {
      startLocationTracking();
    } else if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }
  }, [online, location, currentRegion]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        };
        setLocation(coords);
      } else {
        Alert.alert('位置情報エラー', 'ドライバーモードには位置情報が必要です');
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const detectUserRegion = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/stations/nearby-regional?lat=${location.latitude}&lon=${location.longitude}&radius=1`
      );
      const data = await response.json();
      setCurrentRegion(data.detectedRegion);
      setPrefecture(data.prefecture);
      setNearbyStations(data.stations || []);
    } catch (error) {
      console.error('Failed to detect region:', error);
      // Fallback to Tokyo if detection fails
      setCurrentRegion('tokyo');
      setPrefecture('東京都');
    }
  };

  const startLocationTracking = async () => {
    try {
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 100, // 100 meters
        },
        (newLocation) => {
          const coords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude
          };
          setLocation(coords);

          // Send location to backend
          if (socket && connected) {
            socket.emit('driver:location', coords);
          }

          // Update nearby stations periodically
          updateNearbyStations(coords);
        }
      );
      setLocationWatcher(watcher);
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const updateNearbyStations = async (coords) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/stations/nearby-regional?lat=${coords.latitude}&lon=${coords.longitude}&radius=1`
      );
      const data = await response.json();
      setNearbyStations(data.stations || []);
    } catch (error) {
      console.error('Failed to update nearby stations:', error);
    }
  };

  const fetchRegionalAIRecommendations = async (coords) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/recommendations/regional?lat=${coords.latitude}&lon=${coords.longitude}`
      );
      const data = await response.json();
      setAiRecommendations(data.recommendations);
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error);
    }
  };

  const fetchRegionalHighDemandStations = async () => {
    try {
      if (!currentRegion) return;

      const response = await fetch(`${BACKEND_URL}/api/stations/region/${currentRegion}?demandLevel=very_high`);
      const data = await response.json();
      setHighDemandStations(data.stations || []);
    } catch (error) {
      console.error('Failed to fetch high-demand stations:', error);
    }
  };

  const fetchRegionalWeatherInfo = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/weather/forecast-regional?lat=${location.latitude}&lon=${location.longitude}`
      );
      const data = await response.json();
      setWeatherInfo(data);
    } catch (error) {
      console.error('Failed to fetch regional weather:', error);
    }
  };

  const connectToBackend = () => {
    try {
      const newSocket = io(BACKEND_URL);

      newSocket.on('connect', () => {
        console.log('Connected to backend');
        setConnected(true);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setConnected(false);
      });

      newSocket.on('ride:new', (ride) => {
        const regionInfo = ride.prefecture ? `\n地域: ${ride.prefecture}` : '';
        const stationInfo = ride.pickupStationInfo
          ? `\n乗車場所: ${ride.pickupStationInfo}`
          : '';
        const destinationInfo = ride.destinationStationInfo
          ? `\n目的地: ${ride.destinationStationInfo}`
          : '';

        Alert.alert(
          '🆕 新しい配車リクエスト',
          `乗車: ${ride.pickup}${stationInfo}\n目的地: ${ride.destination}${destinationInfo}${regionInfo}\n予想料金: ¥${ride.estimatedFare || 2000}\n距離: ${ride.distanceToPickup ? ride.distanceToPickup.toFixed(1) + 'km' : '不明'}`,
          [
            { text: '拒否', style: 'cancel' },
            { text: '承諾', onPress: () => acceptRide(ride) }
          ]
        );
      });

      newSocket.on('stations:nearby', (data) => {
        setNearbyStations(data.stations || []);
      });

      newSocket.on('ai:recommendations', (data) => {
        setAiRecommendations(data.recommendations);
        setCurrentRegion(data.region);
        setPrefecture(data.prefecture);
      });

      newSocket.on('driver:connected', (data) => {
        setCurrentRegion(data.region);
        setPrefecture(data.prefecture);
      });

      newSocket.on('ride:taken', () => {
        // Another driver took the ride
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const goOnline = () => {
    if (!socket || !connected) {
      Alert.alert('エラー', 'サーバーに接続されていません');
      return;
    }
    if (!location) {
      Alert.alert('エラー', '位置情報が取得できていません');
      return;
    }
    if (!currentRegion) {
      Alert.alert('エラー', 'エリアが検出できていません');
      return;
    }

    setOnline(true);
    socket.emit('driver:connect', {
      driverId: 'driver_' + Math.random().toString(36).substr(2, 9),
      name: 'ドライバー',
      location: location,
      region: currentRegion,
      prefecture: prefecture
    });

    fetchRegionalHighDemandStations();
    fetchRegionalAIRecommendations(location);
  };

  const goOffline = () => {
    if (socket) {
      socket.emit('driver:offline');
    }
    setOnline(false);
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }
  };

  const acceptRide = (ride) => {
    setCurrentRide(ride);
    if (socket) {
      socket.emit('ride:accept', {
        rideId: ride.rideId,
        driverLocation: location
      });
      Alert.alert('承諾完了', `${ride.prefecture || prefecture}で配車を承諾しました`);
    }
  };

  const completeRide = () => {
    if (currentRide && socket) {
      const fare = currentRide.estimatedFare || 2000;
      socket.emit('ride:complete', {
        rideId: currentRide.rideId,
        fare: fare
      });

      setEarnings(earnings + fare);
      setRidesCompleted(ridesCompleted + 1);
      setCurrentRide(null);

      Alert.alert('配車完了', `料金: ¥${fare.toLocaleString()}\n地域: ${prefecture}`);

      // Refresh AI recommendations after completing ride
      if (location) {
        fetchRegionalAIRecommendations(location);
      }
    }
  };

  const navigateToStation = (station) => {
    const distance = location ? calculateDistance(location, station.coords).toFixed(1) : '不明';
    Alert.alert(
      '駅へ移動',
      `${station.name}駅へ移動しますか？\n${station.lines.join(', ')}\n需要レベル: ${station.demandLevel}\n距離: ${distance}km\n地域: ${prefecture}`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '移動', onPress: () => {
          Alert.alert('ナビ開始', `${prefecture}の${station.name}駅への移動を開始します`);
        }}
      ]
    );
  };

  const handleSwitch = () => {
    if (online) {
      Alert.alert('警告', 'オンライン中はモードを切り替えできません');
      return;
    }
    if (onSwitchMode) {
      onSwitchMode();
    }
  };

  const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2) return 0;
    const R = 6371;
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const renderRecommendationItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.recommendationItem}
      onPress={() => navigateToStation(item)}
    >
      <View style={styles.stationHeader}>
        <Text style={styles.stationName}>{item.name}駅</Text>
        <Text style={styles.demandBadge}>{item.demandLevel}</Text>
      </View>
      <Text style={styles.stationLines}>
        {item.lines.slice(0, 3).join(', ')}
        {item.lines.length > 3 && ` 他${item.lines.length - 3}線`}
      </Text>
      <Text style={styles.stationDistance}>
        {location ? `${calculateDistance(location, item.coords).toFixed(1)}km` : ''}
      </Text>
    </TouchableOpacity>
  );

  if (!location) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>位置情報を取得中...</Text>
      </SafeAreaView>
    );
  }

  if (!currentRegion) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>エリアを検出中...</Text>
        <Text style={styles.regionText}>全国対応の準備をしています</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header with Regional Info */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>🚗 ドライバー</Text>
            <Text style={styles.regionBadge}>{prefecture}</Text>
          </View>
          <TouchableOpacity onPress={handleSwitch} style={styles.switchButton}>
            <Text style={styles.switchText}>お客様モードへ</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: connected ? '#4CAF50' : '#f44336' }]} />
          <Text style={styles.statusText}>
            {connected ? `${prefecture}で接続済み` : '未接続'}
          </Text>
          {online && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>オンライン</Text>
            </View>
          )}
        </View>

        {/* Regional Weather Info */}
        {weatherInfo && (
          <View style={styles.weatherCard}>
            <Text style={styles.weatherTitle}>🌦️ {weatherInfo.location}の天気・需要情報</Text>
            <Text style={styles.weatherText}>
              現在: {weatherInfo.current.temp}°C {weatherInfo.current.description}
            </Text>
            {weatherInfo.rainAlert && (
              <Text style={styles.rainAlert}>
                ⚠️ {weatherInfo.location}で雨予報 - 駅周辺の需要が高まります！
              </Text>
            )}
          </View>
        )}

        {/* Coverage Info */}
        <View style={styles.coverageCard}>
          <Text style={styles.coverageTitle}>🗾 全国AIタクシー</Text>
          <Text style={styles.coverageText}>
            現在地: {prefecture} | 全国47都道府県対応
          </Text>
          <Text style={styles.coverageSubtext}>
            {prefecture}の駅情報と天気を連動したAI配車
          </Text>
        </View>

        {/* Online/Offline Toggle */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.toggleButton, online ? styles.offlineButton : styles.onlineButton]}
            onPress={online ? goOffline : goOnline}
            disabled={!connected || !currentRegion}
          >
            <Text style={styles.toggleButtonText}>
              {online ? 'オフラインにする' : `${prefecture}でオンラインにする`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Dashboard */}
        <View style={styles.dashboardRow}>
          <View style={styles.earningsCard}>
            <Text style={styles.cardTitle}>本日の売上</Text>
            <Text style={styles.earningsAmount}>¥{earnings.toLocaleString()}</Text>
            <Text style={styles.earningsRegion}>{prefecture}</Text>
          </View>
          <View style={styles.ridesCard}>
            <Text style={styles.cardTitle}>完了配車</Text>
            <Text style={styles.ridesAmount}>{ridesCompleted}回</Text>
            <Text style={styles.ridesRegion}>{prefecture}</Text>
          </View>
        </View>

        {/* Map/Recommendations Toggle */}
        <View style={styles.mapToggle}>
          <TouchableOpacity
            style={[styles.toggleButtonSmall, showMap && styles.activeToggle]}
            onPress={() => setShowMap(true)}
          >
            <Text style={[styles.toggleTextSmall, showMap && styles.activeToggleText]}>地図</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButtonSmall, !showMap && styles.activeToggle]}
            onPress={() => setShowMap(false)}
          >
            <Text style={[styles.toggleTextSmall, !showMap && styles.activeToggleText]}>AI推奨</Text>
          </TouchableOpacity>
        </View>

        {/* Map View */}
        {showMap ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              showsUserLocation={true}
            >
              {/* Driver Location */}
              <Marker coordinate={location} title="あなたの位置" pinColor="blue">
                <View style={styles.driverMarker}>
                  <Text style={styles.driverMarkerText}>🚗</Text>
                </View>
              </Marker>

              {/* Regional Stations */}
              {nearbyStations.map((station, index) => (
                <Marker
                  key={index}
                  coordinate={station.coords}
                  title={station.name + '駅'}
                  description={`${prefecture} | 需要: ${station.demandLevel} | ${station.lines.join(', ')}`}
                  pinColor="orange"
                />
              ))}

              {/* High Demand Stations */}
              {highDemandStations.map((station, index) => (
                <Circle
                  key={`demand-${index}`}
                  center={station.coords}
                  radius={800}
                  fillColor="rgba(255, 193, 7, 0.2)"
                  strokeColor="rgba(255, 193, 7, 0.8)"
                />
              ))}

              {/* Weather-sensitive areas when raining */}
              {weatherInfo && weatherInfo.rainAlert && nearbyStations
                .filter(s => s.weatherSensitive)
                .map((station, index) => (
                  <Circle
                    key={`weather-${index}`}
                    center={station.coords}
                    radius={600}
                    fillColor="rgba(244, 67, 54, 0.2)"
                    strokeColor="rgba(244, 67, 54, 0.6)"
                  />
                ))
              }

              {/* Current Ride Markers */}
              {currentRide && (
                <>
                  {currentRide.pickupCoords && (
                    <Marker
                      coordinate={currentRide.pickupCoords}
                      title="お客様の乗車場所"
                      pinColor="green"
                    />
                  )}
                  {currentRide.destinationCoords && (
                    <Marker
                      coordinate={currentRide.destinationCoords}
                      title="目的地"
                      pinColor="red"
                    />
                  )}
                </>
              )}
            </MapView>

            <View style={styles.mapLegend}>
              <Text style={styles.legendTitle}>地図凡例 ({prefecture})</Text>
              <Text style={styles.legendItem}>🟡 高需要エリア</Text>
              {weatherInfo && weatherInfo.rainAlert && (
                <Text style={styles.legendItem}>🔴 雨による需要増加エリア</Text>
              )}
              <Text style={styles.legendItem}>🟠 駅</Text>
            </View>
          </View>
        ) : (
          /* Regional AI Recommendations */
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>🤖 {prefecture}のAI推奨エリア</Text>

            {aiRecommendations && (
              <>
                {/* High Demand Stations */}
                {aiRecommendations.highDemand.length > 0 && (
                  <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationSectionTitle}>🔥 {prefecture}の高需要エリア</Text>
                    <FlatList
                      data={aiRecommendations.highDemand}
                      renderItem={renderRecommendationItem}
                      keyExtractor={(item) => `high-${item.id}`}
                    />
                  </View>
                )}

                {/* Weather-based Recommendations */}
                {aiRecommendations.weatherBased.length > 0 && (
                  <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationSectionTitle}>🌧️ 天気連動エリア ({prefecture})</Text>
                    <FlatList
                      data={aiRecommendations.weatherBased}
                      renderItem={renderRecommendationItem}
                      keyExtractor={(item) => `weather-${item.id}`}
                    />
                  </View>
                )}

                {/* Nearby Stations */}
                {aiRecommendations.nearby.length > 0 && (
                  <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationSectionTitle}>📍 近くの駅</Text>
                    <FlatList
                      data={aiRecommendations.nearby}
                      renderItem={renderRecommendationItem}
                      keyExtractor={(item) => `nearby-${item.id}`}
                    />
                  </View>
                )}

                <Text style={styles.aiMessage}>{aiRecommendations.message}</Text>
              </>
            )}
          </View>
        )}

        {/* Current Ride */}
        {currentRide && (
          <View style={styles.rideCard}>
            <Text style={styles.cardTitle}>現在の配車 ({currentRide.prefecture || prefecture})</Text>
            <View style={styles.rideDetails}>
              <Text style={styles.rideDetail}>乗車: {currentRide.pickup}</Text>
              <Text style={styles.rideDetail}>目的地: {currentRide.destination}</Text>
              <Text style={styles.rideDetail}>料金: ¥{currentRide.estimatedFare?.toLocaleString()}</Text>
              {currentRide.pickupStations && currentRide.pickupStations.length > 0 && (
                <Text style={styles.rideStationInfo}>
                  最寄駅: {currentRide.pickupStations[0].name}駅
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={completeRide}
            >
              <Text style={styles.completeButtonText}>配車完了</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Regional AI Insights */}
        {online && !currentRide && (
          <View style={styles.insightsCard}>
            <Text style={styles.cardTitle}>💡 {prefecture}での収益アップのヒント</Text>
            <Text style={styles.insightText}>
              • 雨予報時は{prefecture}の駅周辺で待機すると効率的です
            </Text>
            <Text style={styles.insightText}>
              • 平日18:00-20:00は主要駅が高需要
            </Text>
            <Text style={styles.insightText}>
              • 週末は繁華街エリアがおすすめ
            </Text>
            {nearbyStations.length > 0 && (
              <Text style={styles.insightText}>
                • 現在地から最も近い駅: {nearbyStations[0].name}駅
                ({location ? calculateDistance(location, nearbyStations[0].coords).toFixed(1) : '0'}km)
              </Text>
            )}
          </View>
        )}

        {/* Online Status Message */}
        {online && !currentRide && (
          <View style={styles.onlineMessage}>
            <Text style={styles.onlineText}>
              📡 {prefecture}で配車リクエスト受付中...
              {nearbyStations.length > 0 && `\n近くの駅: ${nearbyStations[0].name}駅`}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  regionText: {
    marginTop: 5,
    fontSize: 14,
    color: '#2196F3',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
  },
  regionBadge: {
    fontSize: 12,
    backgroundColor: '#2196F3',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  switchButton: {
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  switchText: {
    color: 'white',
    fontSize: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    marginTop: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  onlineBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  onlineBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  weatherCard: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  weatherText: {
    fontSize: 14,
    color: '#333',
  },
  rainAlert: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
    marginTop: 5,
  },
  coverageCard: {
    backgroundColor: '#F1F8E9',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
  },
  coverageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 5,
  },
  coverageText: {
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 3,
  },
  coverageSubtext: {
    fontSize: 12,
    color: '#66BB6A',
  },
  controls: {
    padding: 20,
  },
  toggleButton: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  onlineButton: {
    backgroundColor: '#4CAF50',
  },
  offlineButton: {
    backgroundColor: '#f44336',
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dashboardRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  earningsCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  ridesCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earningsRegion: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  ridesAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  ridesRegion: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  mapToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButtonSmall: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  activeToggle: {
    backgroundColor: '#2196F3',
  },
  toggleTextSmall: {
    fontSize: 14,
    color: '#666',
  },
  activeToggleText: {
    color: 'white',
    fontWeight: '600',
  },
  mapContainer: {
    height: 300,
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLegend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 5,
    minWidth: 150,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  legendItem: {
    fontSize: 10,
    marginBottom: 2,
  },
  driverMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerText: {
    fontSize: 20,
  },
  recommendationsContainer: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  recommendationSection: {
    marginBottom: 20,
  },
  recommendationSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  recommendationItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 8,
    borderRadius: 10,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  demandBadge: {
    fontSize: 10,
    backgroundColor: '#FF9800',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stationLines: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  stationDistance: {
    fontSize: 12,
    color: '#2196F3',
  },
  aiMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  rideCard: {
    backgroundColor: '#E8F5E8',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
  },
  rideDetails: {
    marginBottom: 15,
  },
  rideDetail: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 5,
  },
  rideStationInfo: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 5,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  insightsCard: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
  },
  insightText: {
    fontSize: 13,
    color: '#E65100',
    marginBottom: 8,
    lineHeight: 18,
  },
  onlineMessage: {
    backgroundColor: '#E8F5E8',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  onlineText: {
    color: '#2E7D32',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
