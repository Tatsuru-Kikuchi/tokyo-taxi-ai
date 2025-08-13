import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  FlatList
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// CHANGE THIS TO YOUR PRODUCTION URL
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const LINE_OA_ID = '@dhai52765howdah'; // Add your LINE Official Account ID

export default function CustomerScreen({ onSwitchMode }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [location, setLocation] = useState(null);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [rideStatus, setRideStatus] = useState('idle');
  const [onlineDrivers, setOnlineDrivers] = useState(0);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    requestLocationPermission();
    connectToBackend();
    fetchWeatherInfo();
    return () => {
      if (socket) socket.close();
    };
  }, []);

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
        setPickupCoords(coords);
        fetchNearbyStations(coords);
      } else {
        Alert.alert('位置情報エラー', '位置情報の使用を許可してください');
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const fetchNearbyStations = async (coords) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/stations/nearby?lat=${coords.latitude}&lon=${coords.longitude}&radius=2`
      );
      const data = await response.json();
      setNearbyStations(data.stations || []);
    } catch (error) {
      console.error('Failed to fetch nearby stations:', error);
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
        newSocket.emit('customer:connect', {
          customerId: 'customer_' + Math.random().toString(36).substr(2, 9),
          location: location
        });
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setConnected(false);
      });

      newSocket.on('drivers:update', (data) => {
        setOnlineDrivers(data.onlineCount || 0);
      });

      newSocket.on('drivers:nearby', (drivers) => {
        setNearbyDrivers(drivers || []);
      });

      newSocket.on('stations:nearby', (data) => {
        setNearbyStations(data.stations || []);
      });

      newSocket.on('ride:accepted', (data) => {
        setRideStatus('accepted');
        setDriverLocation(data.driverLocation);
        setEta(data.estimatedArrival);
        Alert.alert('🚕 ドライバーが見つかりました！', `ドライバーが向かっています。\n到着予定: ${data.estimatedArrival}`);
      });

      newSocket.on('driver:location', (data) => {
        setDriverLocation(data.location);
        setEta(data.eta);
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Connection error:', error);
      setConnected(false);
    }
  };

  const selectLocationOnMap = (coordinate, isPickup = true) => {
    if (isPickup) {
      setPickupCoords(coordinate);
      reverseGeocode(coordinate, setPickup);
    } else {
      setDestinationCoords(coordinate);
      reverseGeocode(coordinate, setDestination);
    }
    calculateFare();
  };

  const reverseGeocode = async (coords, setter) => {
    try {
      const result = await Location.reverseGeocodeAsync(coords);
      if (result.length > 0) {
        const address = result[0];
        const addressString = `${address.name || ''} ${address.street || ''} ${address.district || ''}`
          .trim().replace(/\s+/g, ' ');
        setter(addressString || '選択した場所');
      }
    } catch (error) {
      setter('選択した場所');
    }
  };

  const calculateFare = () => {
    if (pickupCoords && destinationCoords) {
      const distance = calculateDistance(pickupCoords, destinationCoords);
      const baseFare = 500;
      const perKm = 300;
      const fare = Math.round(baseFare + (distance * perKm));
      setEstimatedFare(fare);
    }
  };

  const calculateDistance = (coord1, coord2) => {
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

  const selectStation = (station, isPickup = true) => {
    if (isPickup) {
      setPickup(station.name + '駅');
      setPickupCoords(station.coords);
    } else {
      setDestination(station.name + '駅');
      setDestinationCoords(station.coords);
    }
    calculateFare();
  };

  const requestRide = () => {
    if (!pickupCoords || !destinationCoords) {
      Alert.alert('エラー', '乗車場所と目的地を選択してください');
      return;
    }

    if (!socket || !connected) {
      Alert.alert('接続エラー', 'サーバーに接続できません。もう一度お試しください。');
      return;
    }

    setRideStatus('requesting');
    socket.emit('ride:request', {
      pickup,
      destination,
      pickupCoords,
      destinationCoords,
      timestamp: new Date().toISOString()
    });
  };

  const openLINE = () => {
    const lineURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
    Linking.openURL(lineURL).catch(() => {
      Alert.alert('エラー', 'LINEアプリがインストールされていません');
    });
  };

  const handleSwitch = () => {
    if (onSwitchMode) {
      onSwitchMode();
    }
  };

  const renderStationItem = ({ item, index }) => (
    <View style={styles.stationItem}>
      <TouchableOpacity
        style={styles.stationButton}
        onPress={() => selectStation(item, true)}
      >
        <Text style={styles.stationName}>{item.name}駅</Text>
        <Text style={styles.stationDistance}>
          {location ? `${calculateDistance(location, item.coords).toFixed(1)}km` : ''}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.destinationButton}
        onPress={() => selectStation(item, false)}
      >
        <Text style={styles.destinationButtonText}>目的地</Text>
      </TouchableOpacity>
    </View>
  );

  if (!location) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>位置情報を取得中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚕 お客様</Text>
          <TouchableOpacity onPress={handleSwitch} style={styles.switchButton}>
            <Text style={styles.switchText}>ドライバーモードへ</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: connected ? '#4CAF50' : '#f44336' }]} />
          <Text style={styles.statusText}>
            {connected
              ? `${onlineDrivers}名のドライバーが待機中`
              : '接続中...'}
          </Text>
        </View>

        {/* Weather Info */}
        {weatherInfo && (
          <View style={styles.weatherCard}>
            <Text style={styles.weatherTitle}>🌦️ 天気情報</Text>
            <Text style={styles.weatherText}>
              現在: {weatherInfo.current.temp}°C {weatherInfo.current.description}
            </Text>
            {weatherInfo.rainAlert && (
              <Text style={styles.rainAlert}>⚠️ 雨予報 - 需要が高まる可能性があります</Text>
            )}
          </View>
        )}

        {/* Map Toggle */}
        <View style={styles.mapToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, showMap && styles.activeToggle]}
            onPress={() => setShowMap(true)}
          >
            <Text style={[styles.toggleText, showMap && styles.activeToggleText]}>地図</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !showMap && styles.activeToggle]}
            onPress={() => setShowMap(false)}
          >
            <Text style={[styles.toggleText, !showMap && styles.activeToggleText]}>駅選択</Text>
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
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              onPress={(e) => selectLocationOnMap(e.nativeEvent.coordinate, true)}
            >
              {/* Current Location */}
              <Marker coordinate={location} title="現在地" pinColor="blue" />

              {/* Pickup Location */}
              {pickupCoords && (
                <Marker coordinate={pickupCoords} title="乗車場所" pinColor="green" />
              )}

              {/* Destination */}
              {destinationCoords && (
                <Marker coordinate={destinationCoords} title="目的地" pinColor="red" />
              )}

              {/* Nearby Stations */}
              {nearbyStations.map((station, index) => (
                <Marker
                  key={index}
                  coordinate={station.coords}
                  title={station.name + '駅'}
                  description={station.lines.join(', ')}
                  pinColor="orange"
                />
              ))}

              {/* Nearby Drivers */}
              {nearbyDrivers.map((driver, index) => (
                <Marker
                  key={`driver-${index}`}
                  coordinate={driver.location}
                  title="ドライバー"
                  pinColor="blue"
                >
                  <View style={styles.driverMarker}>
                    <Text style={styles.driverMarkerText}>🚗</Text>
                  </View>
                </Marker>
              ))}

              {/* Driver Location (when ride accepted) */}
              {driverLocation && (
                <Marker
                  coordinate={driverLocation}
                  title="あなたのドライバー"
                  pinColor="purple"
                >
                  <View style={styles.activeTaxiMarker}>
                    <Text style={styles.activeTaxiText}>🚕</Text>
                  </View>
                </Marker>
              )}

              {/* Weather-sensitive areas */}
              {weatherInfo && weatherInfo.rainAlert && nearbyStations
                .filter(s => s.demandLevel === 'very_high')
                .map((station, index) => (
                  <Circle
                    key={`weather-${index}`}
                    center={station.coords}
                    radius={500}
                    fillColor="rgba(255, 0, 0, 0.1)"
                    strokeColor="rgba(255, 0, 0, 0.3)"
                  />
                ))
              }
            </MapView>

            <View style={styles.mapInstructions}>
              <Text style={styles.instructionText}>地図をタップして乗車場所を選択</Text>
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={() => {
                  setPickupCoords(location);
                  reverseGeocode(location, setPickup);
                }}
              >
                <Text style={styles.currentLocationText}>現在地を乗車場所にする</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Station Selection */
          <View style={styles.stationContainer}>
            <Text style={styles.sectionTitle}>近くの駅から選択</Text>
            <FlatList
              data={nearbyStations}
              renderItem={renderStationItem}
              keyExtractor={(item) => item.id}
              style={styles.stationList}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={openLINE}>
            <Text style={styles.actionText}>💬 LINE予約</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Form */}
        <View style={styles.bookingForm}>
          <Text style={styles.sectionTitle}>配車予約</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>乗車場所</Text>
            <TextInput
              style={styles.input}
              placeholder="📍 乗車場所を入力または地図で選択"
              value={pickup}
              onChangeText={setPickup}
              editable={rideStatus === 'idle'}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>目的地</Text>
            <TextInput
              style={styles.input}
              placeholder="🎯 目的地を入力または地図で選択"
              value={destination}
              onChangeText={setDestination}
              editable={rideStatus === 'idle'}
            />
          </View>

          {/* Fare Estimate */}
          {estimatedFare > 0 && (
            <View style={styles.fareContainer}>
              <Text style={styles.fareLabel}>予想料金</Text>
              <Text style={styles.fareAmount}>¥{estimatedFare.toLocaleString()}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.bookButton, (!connected || rideStatus !== 'idle' || !pickupCoords || !destinationCoords) && styles.bookButtonDisabled]}
            onPress={requestRide}
            disabled={!connected || rideStatus !== 'idle' || !pickupCoords || !destinationCoords}
          >
            <Text style={styles.bookButtonText}>
              {rideStatus === 'idle' ? '配車をリクエスト' : '処理中...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Display */}
        {rideStatus === 'requesting' && (
          <View style={styles.statusCard}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.statusTitle}>ドライバーを探しています...</Text>
            <Text style={styles.statusSubtitle}>しばらくお待ちください</Text>
          </View>
        )}

        {rideStatus === 'accepted' && (
          <View style={styles.statusCard}>
            <Text style={styles.emoji}>🚕</Text>
            <Text style={styles.statusTitle}>ドライバーが向かっています！</Text>
            {eta && <Text style={styles.etaText}>到着予定: {eta}</Text>}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setRideStatus('idle');
                setPickup('');
                setDestination('');
                setPickupCoords(null);
                setDestinationCoords(null);
                setDriverLocation(null);
                setEta(null);
              }}
            >
              <Text style={styles.cancelButtonText}>新しい予約</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Nearby Stations Info */}
        {nearbyStations.length > 0 && showMap && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🚇 近くの駅情報</Text>
            {nearbyStations.slice(0, 3).map((station, index) => (
              <View key={index} style={styles.stationInfo}>
                <Text style={styles.stationInfoName}>{station.name}駅</Text>
                <Text style={styles.stationInfoLines}>
                  {station.lines.slice(0, 2).join(', ')}
                  {station.lines.length > 2 && ` 他${station.lines.length - 2}線`}
                </Text>
                <Text style={styles.stationInfoDistance}>
                  {location ? `${calculateDistance(location, station.coords).toFixed(1)}km` : ''}
                </Text>
              </View>
            ))}
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
    backgroundColor: '#2196F3',
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
    fontSize: 12,
    color: '#f44336',
    marginTop: 5,
  },
  mapToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  activeToggle: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
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
  },
  map: {
    flex: 1,
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 5,
  },
  instructionText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
  currentLocationButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  currentLocationText: {
    color: 'white',
    fontSize: 12,
  },
  driverMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerText: {
    fontSize: 16,
  },
  activeTaxiMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTaxiText: {
    fontSize: 20,
  },
  stationContainer: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  stationList: {
    maxHeight: 300,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  stationButton: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stationDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  destinationButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  destinationButtonText: {
    color: 'white',
    fontSize: 12,
  },
  quickActions: {
    padding: 20,
  },
  actionButton: {
    backgroundColor: '#00B900',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookingForm: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 5,
    fontSize: 16,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  fareLabel: {
    fontSize: 16,
    color: '#666',
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  emoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  etaText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 10,
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 5,
  },
  cancelButtonText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  stationInfo: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stationInfoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stationInfoLines: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  stationInfoDistance: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
});
