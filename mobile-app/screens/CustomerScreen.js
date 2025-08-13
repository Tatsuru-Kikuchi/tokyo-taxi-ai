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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerScreen = ({ onSwitchMode, onBackToSelection }) => {
  // Configuration
  const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
  const LINE_OA_ID = '@dhai52765howdah';
  const API_BASE_URL = BACKEND_URL;

  // Fix: Provide default props to prevent undefined crash
  const switchMode = onSwitchMode || (() => {
    console.warn('onSwitchMode prop not provided');
  });
  const backToSelection = onBackToSelection || (() => {
    console.warn('onBackToSelection prop not provided');
  });

  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState('tokyo');
  const [prefecture, setPrefecture] = useState('東京都');
  const [nearbyStations, setNearbyStations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Socket handling
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    initializeApp();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketConnected(false);
      } catch (error) {
        console.warn('Socket cleanup error:', error);
      }
    }
  };

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('位置情報の許可が必要です');
      }

      // Step 2: Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      if (!currentLocation?.coords) {
        throw new Error('位置情報を取得できません');
      }

      setLocation(currentLocation.coords);

      // Step 3: Detect region
      await detectRegion(currentLocation.coords.latitude, currentLocation.coords.longitude);

    } catch (error) {
      console.error('App initialization error:', error);
      setError(error.message);

      // Fallback to default location (Tokyo)
      setLocation({ latitude: 35.6762, longitude: 139.6503 });
      setRegion('tokyo');
      setPrefecture('東京都');
    } finally {
      setLoading(false);
    }
  };

  const detectRegion = async (lat, lon) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/stations/nearby-regional?lat=${lat}&lon=${lon}&radius=2`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.detectedRegion && data.prefecture) {
        setRegion(data.detectedRegion);
        setPrefecture(data.prefecture);
        setNearbyStations(data.stations || []);

        // Save to AsyncStorage with error handling
        await saveToStorage('userRegion', data.detectedRegion);
        await saveToStorage('userPrefecture', data.prefecture);

        // Load additional data for detected region
        await Promise.all([
          loadWeatherData(data.detectedRegion),
          loadRecommendations(lat, lon),
          loadAvailableDrivers(data.detectedRegion),
          initializeSocket()
        ]);
      }
    } catch (error) {
      console.error('Region detection error:', error);
      await loadSavedRegion();
    }
  };

  // Safe AsyncStorage operations
  const saveToStorage = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`AsyncStorage save error for ${key}:`, error);
    }
  };

  const loadFromStorage = async (key, defaultValue = null) => {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`AsyncStorage load error for ${key}:`, error);
      return defaultValue;
    }
  };

  const loadSavedRegion = async () => {
    try {
      const savedRegion = await loadFromStorage('userRegion', 'tokyo');
      const savedPrefecture = await loadFromStorage('userPrefecture', '東京都');

      setRegion(savedRegion);
      setPrefecture(savedPrefecture);
    } catch (error) {
      console.warn('Load saved region error:', error);
    }
  };

  const loadWeatherData = async (regionName) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/weather/forecast-regional?region=${regionName}`,
        { timeout: 5000 }
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
    if (!lat || !lon) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recommendations/regional?lat=${lat}&lon=${lon}`,
        { timeout: 5000 }
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
        `${API_BASE_URL}/api/drivers/online?region=${regionName}`,
        { timeout: 5000 }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableDrivers(data.total || 0);
      }
    } catch (error) {
      console.warn('Available drivers error:', error);
    }
  };

  // Safer socket initialization
  const initializeSocket = async () => {
    try {
      const io = require('socket.io-client');

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      socketRef.current = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setSocketConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.warn('Socket connection error:', error);
        setSocketConnected(false);
      });

      // Set connection timeout
      setTimeout(() => {
        if (!socketConnected) {
          console.warn('Socket connection timeout');
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
        }
      }, 10000);

    } catch (error) {
      console.warn('Socket initialization error:', error);
      setSocketConnected(false);
    }
  };

  const requestRide = async () => {
    if (!location) {
      Alert.alert('エラー', '位置情報を取得できません');
      return;
    }

    try {
      const rideData = {
        customerId: `customer_${Date.now()}`,
        customerName: 'お客様',
        pickup: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: `${prefecture}内`
        },
        destination: nearbyStations[0] ? {
          latitude: nearbyStations[0].lat,
          longitude: nearbyStations[0].lon,
          address: nearbyStations[0].name
        } : null
      };

      const response = await fetch(`${API_BASE_URL}/api/rides/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rideData),
        timeout: 10000,
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          '配車リクエスト送信完了',
          `${result.availableDrivers}名のドライバーに通知しました`
        );
      } else {
        throw new Error('配車リクエストに失敗しました');
      }
    } catch (error) {
      console.error('Ride request error:', error);
      Alert.alert('エラー', '配車リクエストに失敗しました');
    }
  };

  // LINE Integration Functions
  const openLINESupport = async () => {
    try {
      const lineURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
      const canOpen = await Linking.canOpenURL(lineURL);

      if (canOpen) {
        await Linking.openURL(lineURL);
      } else {
        // Fallback: open LINE web version
        const webURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
        await Linking.openURL(webURL);
      }
    } catch (error) {
      console.error('LINE open error:', error);
      Alert.alert(
        'エラー',
        'LINEアプリを開けませんでした。\nLINE ID: ' + LINE_OA_ID + '\nで検索してください。',
        [
          { text: 'OK', style: 'default' },
          {
            text: 'LINE IDをコピー',
            onPress: () => {
              // In a real app, you might use Clipboard API here
              Alert.alert('LINE ID', LINE_OA_ID);
            }
          }
        ]
      );
    }
  };

  const showSupportOptions = () => {
    Alert.alert(
      'サポート・お問い合わせ',
      'どちらの方法でサポートを受けますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'LINEサポート', onPress: openLINESupport },
        {
          text: 'メールサポート',
          onPress: () => Linking.openURL('mailto:support@zenkoku-ai-taxi.jp?subject=お問い合わせ')
        }
      ]
    );
  };

  const handleRetry = () => {
    setError(null);
    initializeApp();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>アプリを初期化中...</Text>
          <Text style={styles.loadingSubtext}>位置情報と地域データを取得しています</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.switchButton} onPress={switchMode}>
            <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportButton} onPress={showSupportOptions}>
            <Text style={styles.supportButtonText}>サポートに連絡</Text>
          </TouchableOpacity>
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
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: socketConnected ? '#4CAF50' : '#ff6b6b' }
            ]} />
            <Text style={styles.connectionText}>
              {socketConnected ? '接続済み' : 'オフライン'}
            </Text>
          </View>
        </View>

        {/* Map */}
        {location && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
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

              {/* Station markers */}
              {nearbyStations.map((station, index) => (
                <Marker
                  key={station.id || index}
                  coordinate={{
                    latitude: station.lat,
                    longitude: station.lon,
                  }}
                  title={station.name}
                  description={station.description || ''}
                  pinColor="red"
                />
              ))}
            </MapView>
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
            {region}で{availableDrivers}名のドライバーが待機中
          </Text>
        </View>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>AI推奨情報</Text>
            {recommendations.slice(0, 2).map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>{rec.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.rideButton} onPress={requestRide}>
            <Text style={styles.rideButtonText}>配車をリクエスト</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.lineButton} onPress={openLINESupport}>
            <Text style={styles.lineButtonText}>💬 LINEサポート</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={switchMode}>
            <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={backToSelection}>
            <Text style={styles.backButtonText}>モード選択に戻る</Text>
          </TouchableOpacity>
        </View>

        {/* Coverage Info */}
        <View style={styles.coverageContainer}>
          <Text style={styles.coverageText}>全国47都道府県対応予定</Text>
          <Text style={styles.coverageSubtext}>
            現在対応: 東京・名古屋・大阪・京都・福岡・札幌・仙台・広島
          </Text>
          <TouchableOpacity style={styles.supportLinkButton} onPress={showSupportOptions}>
            <Text style={styles.supportLinkText}>サポート・お問い合わせ</Text>
          </TouchableOpacity>
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
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
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
  supportButton: {
    backgroundColor: '#00C300',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  supportButtonText: {
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    color: 'white',
    fontSize: 12,
  },
  mapContainer: {
    height: 300,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
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
  recommendationsContainer: {
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
    marginBottom: 10,
    color: '#333',
  },
  recommendationItem: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
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
  coverageContainer: {
    alignItems: 'center',
    padding: 20,
  },
  coverageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
  },
  coverageSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
    marginBottom: 15,
  },
  supportLinkButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderColor: '#00C300',
    borderWidth: 1,
    borderRadius: 20,
  },
  supportLinkText: {
    color: '#00C300',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default CustomerScreen;
