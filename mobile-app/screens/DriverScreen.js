import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import io from 'socket.io-client';

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const { width, height } = Dimensions.get('window');

export default function DriverScreen({ onSwitchMode }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [earnings, setEarnings] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [nearbyCustomers, setNearbyCustomers] = useState([]);
  const [mapRegion, setMapRegion] = useState({
    latitude: 35.6762,
    longitude: 139.6503,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    getCurrentLocation();
    connectToBackend();
    fetchWeatherData();

    // Update location every 30 seconds when online
    const locationInterval = setInterval(() => {
      if (online) {
        updateDriverLocation();
      }
    }, 30000);

    return () => {
      clearInterval(locationInterval);
      if (socket) socket.close();
    };
  }, [online]);

  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('エラー', '位置情報の許可が必要です');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setCurrentLocation(coords);
    setMapRegion({
      ...coords,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
  };

  const updateDriverLocation = async () => {
    if (!socket || !online) return;

    let location = await Location.getCurrentPositionAsync({});
    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setCurrentLocation(coords);

    // Send location to backend
    socket.emit('driver:location', coords);
  };

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/weather/forecast`);
      const data = await response.json();
      setWeatherData(data);

      // Alert driver if rain is coming
      if (data.rainAlert) {
        Alert.alert(
          '🌧️ 雨の予報',
          '30分後に雨が予想されます。駅前での待機をお勧めします。',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
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
        // Show customer location on map
        if (ride.pickupCoords) {
          setCustomerLocation(ride.pickupCoords);
          if (ride.destinationCoords) {
            setDestinationLocation(ride.destinationCoords);
          }
        }

        Alert.alert(
          '🆕 新しい配車リクエスト',
          `乗車: ${ride.pickup}\n目的地: ${ride.destination}\n予想料金: ¥${ride.estimatedFare || 2000}`,
          [
            { text: '拒否', style: 'cancel', onPress: () => clearRideRequest() },
            { text: '承諾', onPress: () => acceptRide(ride) }
          ]
        );
      });

      newSocket.on('customer:nearby', (customers) => {
        setNearbyCustomers(customers);
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const clearRideRequest = () => {
    setCustomerLocation(null);
    setDestinationLocation(null);
  };

  const goOnline = () => {
    if (!socket || !connected) {
      Alert.alert('エラー', 'サーバーに接続されていません');
      return;
    }

    if (!currentLocation) {
      Alert.alert('エラー', '位置情報を取得中です。しばらくお待ちください。');
      return;
    }

    setOnline(true);
    socket.emit('driver:connect', {
      driverId: 'driver_' + Math.random().toString(36).substr(2, 9),
      name: 'ドライバー',
      location: currentLocation
    });
  };

  const goOffline = () => {
    if (socket) {
      socket.emit('driver:offline');
    }
    setOnline(false);
    clearRideRequest();
  };

  const acceptRide = (ride) => {
    setCurrentRide(ride);
    if (socket) {
      socket.emit('ride:accept', {
        rideId: ride.rideId,
        driverLocation: currentLocation
      });
      Alert.alert('承諾完了', '配車を承諾しました。お客様の場所へ向かってください。');
    }
  };

  const completeRide = () => {
    if (currentRide) {
      const fare = currentRide.estimatedFare || 2000;
      setEarnings(earnings + fare);
      Alert.alert('配車完了', `料金: ¥${fare}`);
      setCurrentRide(null);
      clearRideRequest();
    }
  };

  const handleSwitch = () => {
    if (online) {
      Alert.alert('エラー', 'オフラインにしてから切り替えてください');
      return;
    }
    if (onSwitchMode) {
      onSwitchMode();
    }
  };

  const centerOnMyLocation = () => {
    if (currentLocation) {
      setMapRegion({
        ...currentLocation,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🚗 ドライバー</Text>
        <TouchableOpacity onPress={handleSwitch} style={styles.switchButton}>
          <Text style={styles.switchText}>お客様モードへ</Text>
        </TouchableOpacity>
      </View>

      {/* Weather Alert */}
      {weatherData?.rainAlert && (
        <View style={styles.weatherAlert}>
          <Text style={styles.weatherAlertText}>🌧️ {weatherData.message}</Text>
          <Text style={styles.weatherAlertSubtext}>駅前での待機を推奨</Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsTraffic={true}
        >
          {/* Driver Location */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="現在地"
            >
              <View style={styles.driverMarker}>
                <Text style={styles.driverMarkerText}>🚗</Text>
              </View>
            </Marker>
          )}

          {/* Customer Pickup Location */}
          {customerLocation && (
            <Marker
              coordinate={customerLocation}
              title="お客様乗車場所"
            >
              <View style={styles.customerMarker}>
                <Text style={styles.customerMarkerText}>👤</Text>
              </View>
            </Marker>
          )}

          {/* Destination Location */}
          {destinationLocation && (
            <Marker
              coordinate={destinationLocation}
              title="目的地"
            >
              <View style={styles.destinationMarker}>
                <Text style={styles.destinationMarkerText}>🎯</Text>
              </View>
            </Marker>
          )}

          {/* Weather Overlay - High demand areas */}
          {weatherData?.rainAlert && currentLocation && (
            <>
              {/* Shibuya Station - High demand */}
              <Circle
                center={{ latitude: 35.658517, longitude: 139.701334 }}
                radius={500}
                fillColor="rgba(255, 193, 7, 0.2)"
                strokeColor="rgba(255, 193, 7, 0.5)"
                strokeWidth={2}
              />
              {/* Shinjuku Station - High demand */}
              <Circle
                center={{ latitude: 35.690921, longitude: 139.700258 }}
                radius={500}
                fillColor="rgba(255, 193, 7, 0.2)"
                strokeColor="rgba(255, 193, 7, 0.5)"
                strokeWidth={2}
              />
            </>
          )}

          {/* Nearby waiting customers (when online) */}
          {online && nearbyCustomers.map((customer, index) => (
            <Marker
              key={index}
              coordinate={customer.location}
              opacity={0.7}
            >
              <View style={styles.waitingCustomerMarker}>
                <Text style={styles.waitingCustomerText}>👥</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* My Location Button */}
        <TouchableOpacity style={styles.myLocationButton} onPress={centerOnMyLocation}>
          <Text style={styles.myLocationText}>📍</Text>
        </TouchableOpacity>

        {/* Map Legend */}
        {online && weatherData?.rainAlert && (
          <View style={styles.mapLegend}>
            <Text style={styles.legendTitle}>需要予測エリア</Text>
            <Text style={styles.legendText}>🟡 高需要エリア（雨予報）</Text>
          </View>
        )}
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: connected ? '#4CAF50' : '#f44336' }]} />
          <Text style={styles.statusText}>
            {connected ? '接続済み' : '未接続'}
          </Text>
          {online && (
            <Text style={styles.onlineStatus}> • オンライン</Text>
          )}
        </View>

        {/* Online/Offline Toggle */}
        <TouchableOpacity
          style={[styles.toggleButton, online ? styles.offlineButton : styles.onlineButton]}
          onPress={online ? goOffline : goOnline}
          disabled={!connected}
        >
          <Text style={styles.toggleButtonText}>
            {online ? 'オフラインにする' : 'オンラインにする'}
          </Text>
        </TouchableOpacity>

        {/* Current Ride Info */}
        {currentRide && (
          <View style={styles.rideCard}>
            <Text style={styles.rideCardTitle}>現在の配車</Text>
            <Text style={styles.rideDetail}>乗車: {currentRide.pickup}</Text>
            <Text style={styles.rideDetail}>目的地: {currentRide.destination}</Text>
            <Text style={styles.rideFare}>予想料金: ¥{currentRide.estimatedFare || 2000}</Text>
            <TouchableOpacity style={styles.completeButton} onPress={completeRide}>
              <Text style={styles.completeButtonText}>配車完了</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Earnings and Weather */}
        <View style={styles.infoRow}>
          {/* Earnings Card */}
          <View style={styles.earningsCard}>
            <Text style={styles.cardTitle}>本日の売上</Text>
            <Text style={styles.earningsAmount}>¥{earnings.toLocaleString()}</Text>
          </View>

          {/* Weather Card */}
          <View style={styles.weatherCard}>
            <Text style={styles.cardTitle}>天気</Text>
            {weatherData ? (
              <>
                <Text style={styles.weatherTemp}>{weatherData.current.temp}°C</Text>
                <Text style={styles.weatherDesc}>{weatherData.current.description}</Text>
              </>
            ) : (
              <Text style={styles.weatherDesc}>取得中...</Text>
            )}
          </View>
        </View>

        {/* AI Recommendations */}
        {online && !currentRide && (
          <View style={styles.aiCard}>
            <Text style={styles.aiTitle}>🤖 AI推奨</Text>
            {weatherData?.rainAlert ? (
              <>
                <Text style={styles.aiText}>• 渋谷駅へ移動（雨予報あり）</Text>
                <Text style={styles.aiText}>• 新宿駅周辺も高需要予測</Text>
                <Text style={styles.aiText}>• 30分以内に配車リクエスト増加予想</Text>
              </>
            ) : (
              <>
                <Text style={styles.aiText}>• 現在地で待機を推奨</Text>
                <Text style={styles.aiText}>• 18:00に需要増加予測</Text>
                <Text style={styles.aiText}>• 六本木エリアも検討</Text>
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
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
  weatherAlert: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2196F3',
  },
  weatherAlertText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '600',
  },
  weatherAlertSubtext: {
    color: '#1976D2',
    fontSize: 12,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  myLocationButton: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  myLocationText: {
    fontSize: 24,
  },
  mapLegend: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  driverMarker: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#2196F3',
  },
  driverMarkerText: {
    fontSize: 20,
  },
  customerMarker: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  customerMarkerText: {
    fontSize: 20,
  },
  destinationMarker: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FF5722',
  },
  destinationMarkerText: {
    fontSize: 20,
  },
  waitingCustomerMarker: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 5,
    borderRadius: 15,
  },
  waitingCustomerText: {
    fontSize: 16,
  },
  controlPanel: {
    backgroundColor: 'white',
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    maxHeight: height * 0.4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  onlineStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  toggleButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
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
  rideCard: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  rideCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  rideDetail: {
    fontSize: 14,
    color: '#1B5E20',
    marginTop: 4,
  },
  rideFare: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 8,
  },
  completeButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  earningsCard: {
    backgroundColor: '#FFF8E1',
    padding: 15,
    borderRadius: 10,
    flex: 0.48,
  },
  weatherCard: {
    backgroundColor: '#F3E5F5',
    padding: 15,
    borderRadius: 10,
    flex: 0.48,
  },
  cardTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F57C00',
  },
  weatherTemp: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7B1FA2',
  },
  weatherDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  aiCard: {
    backgroundColor: '#E1F5FE',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0288D1',
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#01579B',
    marginBottom: 8,
  },
  aiText: {
    fontSize: 12,
    color: '#0277BD',
    marginTop: 4,
  },
});
