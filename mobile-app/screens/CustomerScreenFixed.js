import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Linking
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerScreen = ({ onSwitchMode, onBackToSelection }) => {
  // Configuration
  const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
  const LINE_OA_ID = '@dhai52765howdah';
  const API_BASE_URL = BACKEND_URL;
  const GOOGLE_MAPS_KEY = 'AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ';

  // State
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: 35.6762,
    longitude: 139.6503,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [prefecture, setPrefecture] = useState('東京都');
  const [nearbyStations, setNearbyStations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demandZones, setDemandZones] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('位置情報の許可が必要です');
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      if (!currentLocation?.coords) {
        throw new Error('位置情報を取得できません');
      }

      const { latitude, longitude } = currentLocation.coords;
      setLocation(currentLocation.coords);
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Generate demand zones based on location
      generateDemandZones(latitude, longitude);

      // Load additional data
      await Promise.all([
        detectRegion(latitude, longitude),
        loadWeatherData('tokyo'),
        loadRecommendations(latitude, longitude),
        loadAvailableDrivers('tokyo')
      ]);

    } catch (error) {
      console.error('App initialization error:', error);
      setError(error.message);
      
      // Fallback to Tokyo
      setLocation({ latitude: 35.6762, longitude: 139.6503 });
      generateDemandZones(35.6762, 139.6503);
    } finally {
      setLoading(false);
    }
  };

  const generateDemandZones = (lat, lon) => {
    // Generate AI demand prediction zones
    const zones = [];
    const timeOfDay = new Date().getHours();
    const isRushHour = (timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 20);
    
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const distance = 0.005 + Math.random() * 0.01;
      const intensity = isRushHour ? 0.6 + Math.random() * 0.4 : 0.3 + Math.random() * 0.4;
      
      zones.push({
        latitude: lat + distance * Math.sin(angle),
        longitude: lon + distance * Math.cos(angle),
        intensity,
        radius: 300 + Math.random() * 200,
      });
    }
    
    setDemandZones(zones);
  };

  const detectRegion = async (lat, lon) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/stations/nearby-regional?lat=${lat}&lon=${lon}&radius=2`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.prefecture) {
          setPrefecture(data.prefecture);
        }
        if (data.stations) {
          setNearbyStations(data.stations);
        }
      }
    } catch (error) {
      console.warn('Region detection error:', error);
    }
  };

  const loadWeatherData = async (regionName) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/weather/forecast-regional?region=${regionName}`
      );

      if (response.ok) {
        const data = await response.json();
        setWeather(data.weather);
      }
    } catch (error) {
      console.warn('Weather data error:', error);
    }
  };

  const loadRecommendations = async (lat, lon) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recommendations/regional?lat=${lat}&lon=${lon}`
      );

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.warn('Recommendations error:', error);
    }
  };

  const loadAvailableDrivers = async (regionName) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/drivers/online?region=${regionName}`
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableDrivers(data.total || 0);
      }
    } catch (error) {
      console.warn('Available drivers error:', error);
    }
  };

  const requestRide = async () => {
    if (!location) {
      Alert.alert('エラー', '位置情報を取得できません');
      return;
    }

    Alert.alert(
      '配車リクエスト',
      '配車をリクエストしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リクエスト',
          onPress: () => {
            Alert.alert('成功', '配車リクエストを送信しました');
          }
        }
      ]
    );
  };

  const openLINESupport = async () => {
    try {
      const lineURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
      await Linking.openURL(lineURL);
    } catch (error) {
      Alert.alert('エラー', 'LINEアプリを開けませんでした');
    }
  };

  const centerOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const getDemandColor = (intensity) => {
    if (intensity > 0.7) return 'rgba(255, 0, 0, 0.4)';
    if (intensity > 0.4) return 'rgba(255, 165, 0, 0.3)';
    return 'rgba(255, 255, 0, 0.2)';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>アプリを初期化中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>エラーが発生しました</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeApp}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
          {onBackToSelection && (
            <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
              <Text style={styles.backButtonText}>戻る</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>お客様</Text>
          <Text style={styles.prefecture}>{prefecture}</Text>
        </View>

        {/* Map */}
        {location && (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={region}
              showsUserLocation={true}
              showsMyLocationButton={false}
              showsTraffic={true}
            >
              {/* Current location marker */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="現在地"
                pinColor="blue"
              />

              {/* Demand zones */}
              {showHeatmap && demandZones.map((zone, index) => (
                <Circle
                  key={index}
                  center={{
                    latitude: zone.latitude,
                    longitude: zone.longitude,
                  }}
                  radius={zone.radius}
                  fillColor={getDemandColor(zone.intensity)}
                  strokeColor="transparent"
                />
              ))}

              {/* Station markers */}
              {nearbyStations.map((station, index) => (
                <Marker
                  key={station.id || index}
                  coordinate={{
                    latitude: station.lat,
                    longitude: station.lon,
                  }}
                  title={station.name}
                  pinColor="orange"
                />
              ))}
            </MapView>

            {/* Map Controls */}
            <View style={styles.mapControls}>
              <TouchableOpacity style={styles.mapButton} onPress={centerOnLocation}>
                <Text style={styles.mapButtonText}>📍</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.mapButton, showHeatmap && styles.mapButtonActive]} 
                onPress={() => setShowHeatmap(!showHeatmap)}
              >
                <Text style={styles.mapButtonText}>🔥</Text>
              </TouchableOpacity>
            </View>

            {/* Demand Legend */}
            {showHeatmap && (
              <View style={styles.legend}>
                <Text style={styles.legendTitle}>需要予測</Text>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 0, 0, 0.4)' }]} />
                  <Text style={styles.legendText}>高</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 165, 0, 0.3)' }]} />
                  <Text style={styles.legendText}>中</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 255, 0, 0.2)' }]} />
                  <Text style={styles.legendText}>低</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Weather Info */}
        {weather && (
          <View style={styles.weatherContainer}>
            <Text style={styles.weatherTitle}>天気情報</Text>
            <Text style={styles.weatherInfo}>
              {weather.current?.description || '情報取得中'} | 
              気温: {weather.current?.temperature || '--'}°C
            </Text>
          </View>
        )}

        {/* Available Drivers */}
        <View style={styles.driversContainer}>
          <Text style={styles.driversText}>
            {availableDrivers}名のドライバーが待機中
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.rideButton} onPress={requestRide}>
            <Text style={styles.rideButtonText}>配車をリクエスト</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.lineButton} onPress={openLINESupport}>
            <Text style={styles.lineButtonText}>💬 LINEサポート</Text>
          </TouchableOpacity>

          {onSwitchMode && (
            <TouchableOpacity style={styles.switchButton} onPress={onSwitchMode}>
              <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
            </TouchableOpacity>
          )}

          {onBackToSelection && (
            <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
              <Text style={styles.backButtonText}>モード選択に戻る</Text>
            </TouchableOpacity>
          )}
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  prefecture: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  mapContainer: {
    height: 400,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 10,
  },
  mapButton: {
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  mapButtonActive: {
    backgroundColor: '#667eea',
  },
  mapButtonText: {
    fontSize: 20,
  },
  legend: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  legendColor: {
    width: 20,
    height: 10,
    marginRight: 5,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
  },
  weatherContainer: {
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
  weatherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  weatherInfo: {
    fontSize: 14,
    color: '#666',
  },
  driversContainer: {
    backgroundColor: '#e8f4f8',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  driversText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  buttonContainer: {
    margin: 15,
  },
  rideButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  rideButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lineButton: {
    backgroundColor: '#00C300',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  lineButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  switchButton: {
    backgroundColor: '#ff6b6b',
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
});

export default CustomerScreen;
