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
  Linking,
  Dimensions,
  Platform
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const LINE_OA_ID = '@dhai52765howdah';
const { width, height } = Dimensions.get('window');

export default function CustomerScreen({ onSwitchMode }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineDrivers, setOnlineDrivers] = useState(0);
  const [rideStatus, setRideStatus] = useState('idle');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 35.6762,
    longitude: 139.6503,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectingMode, setSelectingMode] = useState(null); // 'pickup' or 'destination'

  useEffect(() => {
    getCurrentLocation();
    connectToBackend();
    fetchWeatherData();
    return () => {
      if (socket) socket.close();
    };
  }, []);

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

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/weather/forecast`);
      const data = await response.json();
      setWeatherData(data);
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
        newSocket.emit('customer:connect', {
          customerId: 'customer_' + Math.random().toString(36).substr(2, 9),
          location: currentLocation
        });
      });

      newSocket.on('drivers:update', (data) => {
        setOnlineDrivers(data.onlineCount || 0);
      });

      newSocket.on('ride:accepted', (data) => {
        setRideStatus('accepted');
        Alert.alert('🚕 ドライバーが見つかりました！', 'ドライバーが向かっています。');
        // Set mock driver location for demo
        if (currentLocation) {
          setDriverLocation({
            latitude: currentLocation.latitude + 0.01,
            longitude: currentLocation.longitude + 0.01,
          });
        }
      });

      newSocket.on('driver:location', (location) => {
        setDriverLocation(location);
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Connection error:', error);
      setConnected(false);
    }
  };

  const handleMapPress = (e) => {
    const coords = e.nativeEvent.coordinate;

    if (selectingMode === 'pickup') {
      setPickupLocation(coords);
      setSelectingMode(null);
      Alert.alert('乗車場所設定', '乗車場所を設定しました');
    } else if (selectingMode === 'destination') {
      setDestinationLocation(coords);
      setSelectingMode(null);
      Alert.alert('目的地設定', '目的地を設定しました');
    }
  };

  const requestRide = () => {
    if (!pickupLocation || !destinationLocation) {
      Alert.alert('エラー', '地図上で乗車場所と目的地をタップして設定してください');
      return;
    }

    if (!socket || !connected) {
      Alert.alert('接続エラー', 'サーバーに接続できません。もう一度お試しください。');
      return;
    }

    setRideStatus('requesting');
    socket.emit('ride:request', {
      pickup: `${pickupLocation.latitude}, ${pickupLocation.longitude}`,
      destination: `${destinationLocation.latitude}, ${destinationLocation.longitude}`,
      pickupCoords: pickupLocation,
      destinationCoords: destinationLocation,
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🚕 お客様</Text>
        <TouchableOpacity onPress={handleSwitch} style={styles.switchButton}>
          <Text style={styles.switchText}>ドライバーモードへ</Text>
        </TouchableOpacity>
      </View>

      {/* Weather Alert */}
      {weatherData?.rainAlert && (
        <View style={styles.weatherAlert}>
          <Text style={styles.weatherAlertText}>🌧️ {weatherData.message}</Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
          region={mapRegion}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Current Location */}
          {currentLocation && (
            <Circle
              center={currentLocation}
              radius={100}
              fillColor="rgba(66, 133, 244, 0.2)"
              strokeColor="rgba(66, 133, 244, 0.5)"
              strokeWidth={2}
            />
          )}

          {/* Pickup Marker */}
          {pickupLocation && (
            <Marker
              coordinate={pickupLocation}
              title="乗車場所"
              pinColor="green"
            >
              <View style={styles.markerContainer}>
                <Text style={styles.markerText}>📍</Text>
              </View>
            </Marker>
          )}

          {/* Destination Marker */}
          {destinationLocation && (
            <Marker
              coordinate={destinationLocation}
              title="目的地"
              pinColor="red"
            >
              <View style={styles.markerContainer}>
                <Text style={styles.markerText}>🎯</Text>
              </View>
            </Marker>
          )}

          {/* Driver Location */}
          {driverLocation && rideStatus === 'accepted' && (
            <Marker
              coordinate={driverLocation}
              title="ドライバー"
            >
              <View style={styles.driverMarker}>
                <Text style={styles.driverMarkerText}>🚕</Text>
              </View>
            </Marker>
          )}

          {/* Weather Overlay - Rain areas */}
          {weatherData?.rainAlert && currentLocation && (
            <Circle
              center={currentLocation}
              radius={2000}
              fillColor="rgba(58, 123, 213, 0.1)"
              strokeColor="rgba(58, 123, 213, 0.3)"
              strokeWidth={2}
              strokeDashPattern={[5, 5]}
            />
          )}
        </MapView>

        {/* Map Instructions Overlay */}
        <View style={styles.mapOverlay}>
          <Text style={styles.mapInstruction}>
            {selectingMode === 'pickup' ? '地図をタップして乗車場所を設定' :
             selectingMode === 'destination' ? '地図をタップして目的地を設定' :
             !pickupLocation ? '下のボタンで場所を設定' :
             !destinationLocation ? '下のボタンで目的地を設定' :
             '配車準備完了'}
          </Text>
        </View>
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: connected ? '#4CAF50' : '#f44336' }]} />
          <Text style={styles.statusText}>
            {connected ? `${onlineDrivers}名のドライバーが待機中` : '接続中...'}
          </Text>
        </View>

        {/* Location Selection Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.locationButton, selectingMode === 'pickup' && styles.activeButton]}
            onPress={() => setSelectingMode('pickup')}
          >
            <Text style={styles.locationButtonText}>
              {pickupLocation ? '📍 乗車場所設定済み' : '📍 乗車場所を設定'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.locationButton, selectingMode === 'destination' && styles.activeButton]}
            onPress={() => setSelectingMode('destination')}
          >
            <Text style={styles.locationButtonText}>
              {destinationLocation ? '🎯 目的地設定済み' : '🎯 目的地を設定'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.lineButton} onPress={openLINE}>
            <Text style={styles.lineButtonText}>💬 LINE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.requestButton, (!pickupLocation || !destinationLocation || !connected) && styles.disabledButton]}
            onPress={requestRide}
            disabled={!pickupLocation || !destinationLocation || !connected || rideStatus !== 'idle'}
          >
            <Text style={styles.requestButtonText}>
              {rideStatus === 'idle' ? '配車をリクエスト 🚕' :
               rideStatus === 'requesting' ? '探しています...' :
               'ドライバーが向かっています'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weather Info */}
        {weatherData && (
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherTitle}>天気予報</Text>
            <Text style={styles.weatherText}>
              現在: {weatherData.current.temp}°C, {weatherData.current.description}
            </Text>
            {weatherData.rainAlert && (
              <Text style={styles.weatherWarning}>⚠️ 雨の予報 - 早めの予約を推奨</Text>
            )}
          </View>
        )}
      </View>

      {/* Status Modal */}
      {rideStatus === 'requesting' && (
        <View style={styles.statusModal}>
          <View style={styles.statusModalContent}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.statusModalText}>ドライバーを探しています...</Text>
          </View>
        </View>
      )}
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
    backgroundColor: '#2196F3',
    borderRadius: 5,
  },
  switchText: {
    color: 'white',
    fontSize: 12,
  },
  weatherAlert: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFC107',
  },
  weatherAlertText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  mapInstruction: {
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
  },
  markerContainer: {
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  markerText: {
    fontSize: 20,
  },
  driverMarker: {
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  driverMarkerText: {
    fontSize: 24,
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
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationButton: {
    flex: 0.48,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  locationButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lineButton: {
    backgroundColor: '#00B900',
    padding: 15,
    borderRadius: 8,
    flex: 0.25,
    alignItems: 'center',
  },
  lineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    flex: 0.72,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  weatherInfo: {
    backgroundColor: '#F0F8FF',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  weatherTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  weatherText: {
    fontSize: 12,
    color: '#666',
  },
  weatherWarning: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 5,
    fontWeight: '600',
  },
  statusModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  statusModalText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
  },
});
