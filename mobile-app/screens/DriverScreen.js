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
    connectToBackend();
    fetchWeatherInfo();
    return () => {
      if (socket) socket.close();
      if (locationWatcher) locationWatcher.remove();
    };
  }, []);

  useEffect(() => {
    if (online && location) {
      startLocationTracking();
    } else if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }
  }, [online, location]);

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
        fetchNearbyStations(coords);
        fetchAIRecommendations(coords);
      } else {
        Alert.alert('位置情報エラー', 'ドライバーモードには位置情報が必要です');
      }
    } catch (error) {
      console.error('Location permission error:', error);
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
          fetchNearbyStations(coords);
        }
      );
      setLocationWatcher(watcher);
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const fetchNearbyStations = async (coords) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/stations/nearby?lat=${coords.latitude}&lon=${coords.longitude}&radius=1`
      );
      const data = await response.json();
      setNearbyStations(data.stations || []);
    } catch (error) {
      console.error('Failed to fetch nearby stations:', error);
    }
  };

  const fetchAIRecommendations = async (coords) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/recommendations?lat=${coords.latitude}&lon=${coords.longitude}`
      );
      const data = await response.json();
      setAiRecommendations(data.recommendations);
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error);
    }
  };

  const fetchHighDemandStations = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stations/high-demand`);
      const data = await response.json();
      setHighDemandStations(data.stations || []);
    } catch (error) {
      console.error('Failed to fetch high-demand stations:', error);
    }
  };

  const fetchWeatherInfo = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/weather/forecast-real`);
      const data = await response.json();
      setWeatherInfo(data);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
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
        const stationInfo = ride.pickupStationInfo
          ? `\n乗車場所: ${ride.pickupStationInfo}`
          : '';
        const destinationInfo = ride.destinationStationInfo
          ? `\n目的地: ${ride.destinationStationInfo}`
          : '';

        Alert.alert(
          '🆕 新しい配車リクエスト',
          `乗車: ${ride.pickup}${stationInfo}\n目的地: ${ride.destination}${destinationInfo}\n予想料金: ¥${ride.estimatedFare || 2000}\n距離: ${ride.distanceToPickup ? ride.distanceToPickup.toFixed(1) + 'km' : '不明'}`,
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

    setOnline(true);
    socket.emit('driver:connect', {
      driverId: 'driver_' + Math.random().toString(36).substr(2, 9),
      name: 'ドライバー',
      location: location
    });

    fetchHighDemandStations();
    fetchAIRecommendations(location);
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
      Alert.alert('承諾完了', '配車を承諾しました');
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

      Alert.alert('配車完了', `料金: ¥${fare.toLocaleString()}`);

      // Refresh AI recommendations after completing ride
      if (location) {
        fetchAIRecommendations(location);
      }
    }
  };

  const navigateToStation = (station) => {
    Alert.alert(
      '駅へ移動',
      `${station.name}駅へ移動しますか？\n${station.lines.join(', ')}\n需要レベル: ${station.demandLevel}`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '移動', onPress: () => {
          Alert.alert('ナビ開始', `${station.name}駅への移動を開始します`);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚗 ドライバー</Text>
          <TouchableOpacity onPress={handleSwitch} style={styles.switchButton}>
            <Text style={styles.switchText}>お客様モードへ</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: connected ? '#4CAF50' : '#f44336' }]} />
          <Text style={styles.statusText}>
            {connected ? '接続済み' : '未接続'}
          </Text>
          {online && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>オンライン</Text>
            </View>
          )}
        </View>

        {/* Weather Info */}
        {weatherInfo && (
          <View style={styles.weatherCard}>
            <Text style={styles.weatherTitle}>🌦️ 天気・需要情報</Text>
            <Text style={styles.weatherText}>
              現在: {weatherInfo.current.temp}°C {weatherInfo.current.description}
            </Text>
            {weatherInfo.rainAlert && (
              <Text style={styles.rainAlert}>
                ⚠️ 雨予報 - 駅周辺の需要が高まります！
              </Text>
            )}
          </View>
        )}

        {/* Online/Offline Toggle */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.toggleButton, online ? styles.offlineButton : styles.onlineButton]}
            onPress={online ? goOffline : goOnline}
            disabled={!connected}
          >
            <Text style={styles.toggleButtonText}>
              {online ? 'オフラインにする' : 'オンラインにする'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Dashboard */}
        <View style={styles.dashboardRow}>
          <View style={styles.earningsCard}>
            <Text style={styles.cardTitle}>本日の売上</Text>
            <Text style={styles.earningsAmount}>¥{earnings.toLocaleString()}</Text>
          </View>
          <View style={styles.ridesCard}>
            <Text style={styles.cardTitle}>完了配車</Text>
            <Text style={styles.ridesAmount}>{ridesCompleted}回</Text>
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

              {/* Nearby Stations */}
              {nearbyStations.map((station, index) => (
                <Marker
                  key={index}
                  coordinate={station.coords}
                  title={station.name + '駅'}
                  description={`需要: ${station.demandLevel} | ${station.lines.join(', ')}`}
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
              <Text style={styles.legendTitle}>地図凡例</Text>
              <Text style={styles.legendItem}>🟡 高需要エリア</Text>
              {weatherInfo && weatherInfo.rainAlert && (
                <Text style={styles.legendItem}>🔴 雨による需要増加エリア</Text>
              )}
              <Text style={styles.legendItem}>🟠 駅</Text>
            </View>
          </View>
        ) : (
          /* AI Recommendations */
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>🤖 AI推奨エリア</Text>

            {aiRecommendations && (
              <>
                {/* High Demand Stations */}
                {aiRecommendations.highDemand.length > 0 && (
                  <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationSectionTitle}>🔥 高需要エリア</Text>
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
                    <Text style={styles.recommendationSectionTitle}>🌧️ 天気連動エリア</Text>
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
            <Text style={styles.cardTitle}>現在の配車</Text>
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

        {/* AI Insights */}
        {online && !currentRide && (
          <View style={styles.insightsCard}>
            <Text style={styles.cardTitle}>💡 収益アップのヒント</Text>
            <Text style={styles.insightText}>
              • 雨予報時は駅周辺で待機すると効率的です
            </Text>
            <Text style={styles.insightText}>
              • 平日18:00-20:00は新宿・渋谷が高需要
            </Text>
            <Text style={styles.insightText}>
              • 週末は六本木・恵比寿がおすすめ
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
              📡 配車リクエスト受付中...
              {location && `\n現在地: ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`}
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
  ridesAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
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
