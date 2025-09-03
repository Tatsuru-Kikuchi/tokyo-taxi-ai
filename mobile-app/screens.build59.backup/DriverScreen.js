import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DriverScreen = ({ onSwitchMode, onBackToSelection }) => {
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
  const [isOnline, setIsOnline] = useState(false);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [earnings, setEarnings] = useState({
    today: 0,
    rides: 0,
    hours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Socket handling
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const locationUpdateRef = useRef(null);

  useEffect(() => {
    initializeDriver();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (socketRef.current) {
      try {
        socketRef.current.emit('driver_offline', { driverId: `driver_${Date.now()}` });
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketConnected(false);
      } catch (error) {
        console.warn('Socket cleanup error:', error);
      }
    }

    if (locationUpdateRef.current) {
      clearInterval(locationUpdateRef.current);
      locationUpdateRef.current = null;
    }
  };

  const initializeDriver = async () => {
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

      setLocation(currentLocation.coords);

      // Load saved data
      await loadSavedData();

      // Detect region and load data
      await detectRegion(currentLocation.coords.latitude, currentLocation.coords.longitude);

    } catch (error) {
      console.error('Driver initialization error:', error);
      setError(error.message);

      // Fallback to default location
      setLocation({ latitude: 35.6762, longitude: 139.6503 });
      setRegion('tokyo');
      setPrefecture('東京都');
    } finally {
      setLoading(false);
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

  const loadSavedData = async () => {
    try {
      const savedEarnings = await loadFromStorage('driverEarnings', { today: 0, rides: 0, hours: 0 });
      const savedOnlineStatus = await loadFromStorage('isDriverOnline', false);

      setEarnings(savedEarnings);
      setIsOnline(savedOnlineStatus);
    } catch (error) {
      console.warn('Load saved data error:', error);
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

        await saveToStorage('driverRegion', data.detectedRegion);
        await saveToStorage('driverPrefecture', data.prefecture);

        // Load additional data
        await Promise.all([
          loadWeatherData(data.detectedRegion),
          loadRecommendations(lat, lon),
          initializeSocket()
        ]);
      }
    } catch (error) {
      console.error('Region detection error:', error);
      await loadSavedRegion();
    }
  };

  const loadSavedRegion = async () => {
    try {
      const savedRegion = await loadFromStorage('driverRegion', 'tokyo');
      const savedPrefecture = await loadFromStorage('driverPrefecture', '東京都');

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
        console.log('Driver socket connected');
        setSocketConnected(true);

        // Register as driver if online
        if (isOnline && location) {
          socketRef.current.emit('driver_online', {
            driverId: `driver_${Date.now()}`,
            driverName: 'ドライバー',
            location: location
          });
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('Driver socket disconnected');
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.warn('Driver socket error:', error);
        setSocketConnected(false);
      });

      socketRef.current.on('ride_request', (rideData) => {
        handleRideRequest(rideData);
      });

      // Connection timeout
      setTimeout(() => {
        if (!socketConnected) {
          console.warn('Driver socket timeout');
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
        }
      }, 10000);

    } catch (error) {
      console.warn('Driver socket initialization error:', error);
      setSocketConnected(false);
    }
  };

  const handleRideRequest = (rideData) => {
    Alert.alert(
      '新しい配車リクエスト',
      `乗車地: ${rideData.pickup?.address || '未指定'}\n目的地: ${rideData.destination?.address || '未指定'}\n料金: ¥${rideData.fare || '未定'}`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '受諾', onPress: () => acceptRide(rideData) }
      ]
    );
  };

  const acceptRide = async (rideData) => {
    try {
      // Update earnings
      const newEarnings = {
        today: earnings.today + (rideData.fare || 1500),
        rides: earnings.rides + 1,
        hours: earnings.hours
      };

      setEarnings(newEarnings);
      await saveToStorage('driverEarnings', newEarnings);

      Alert.alert('成功', '配車リクエストを受諾しました');
    } catch (error) {
      console.error('Accept ride error:', error);
      Alert.alert('エラー', '配車リクエストの受諾に失敗しました');
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      await saveToStorage('isDriverOnline', newStatus);

      if (socketRef.current && socketRef.current.connected) {
        if (newStatus && location) {
          // Go online
          socketRef.current.emit('driver_online', {
            driverId: `driver_${Date.now()}`,
            driverName: 'ドライバー',
            location: location
          });

          // Start location updates
          startLocationUpdates();
        } else {
          // Go offline
          socketRef.current.emit('driver_offline', {
            driverId: `driver_${Date.now()}`
          });

          // Stop location updates
          stopLocationUpdates();
        }
      }

      Alert.alert(
        '状態変更',
        newStatus ? 'オンラインになりました' : 'オフラインになりました'
      );
    } catch (error) {
      console.error('Toggle online error:', error);
      Alert.alert('エラー', '状態の変更に失敗しました');
    }
  };

  const startLocationUpdates = () => {
    if (locationUpdateRef.current) {
      clearInterval(locationUpdateRef.current);
    }

    locationUpdateRef.current = setInterval(async () => {
      try {
        if (isOnline && socketRef.current && socketRef.current.connected) {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setLocation(currentLocation.coords);

          socketRef.current.emit('location_update', {
            driverId: `driver_${Date.now()}`,
            location: currentLocation.coords
          });
        }
      } catch (error) {
        console.warn('Location update error:', error);
      }
    }, 30000); // Update every 30 seconds
  };

  const stopLocationUpdates = () => {
    if (locationUpdateRef.current) {
      clearInterval(locationUpdateRef.current);
      locationUpdateRef.current = null;
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
              Alert.alert('LINE ID', LINE_OA_ID);
            }
          }
        ]
      );
    }
  };

  const showDriverSupport = () => {
    Alert.alert(
      'ドライバーサポート',
      'どちらの方法でサポートを受けますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'LINEサポート', onPress: openLINESupport },
        {
          text: 'メールサポート',
          onPress: () => Linking.openURL('mailto:driver-support@zenkoku-ai-taxi.jp?subject=ドライバーお問い合わせ')
        },
        {
          text: '緊急時サポート',
          onPress: () => Linking.openURL('tel:0120-123-456')
        }
      ]
    );
  };

  const showEarningsHelp = () => {
    Alert.alert(
      '収益向上のヒント',
      'AI推奨エリアに移動することで収益を最大化できます。',
      [
        { text: '閉じる', style: 'cancel' },
        { text: 'LINE相談', onPress: openLINESupport },
        { text: 'ヒント詳細', onPress: () => {
          Alert.alert(
            '収益向上のコツ',
            '• 雨予報30分前に駅周辺へ移動\n• 通勤ラッシュ時間帯を狙う\n• AI推奨エリアを活用\n• オンライン時間を長く保つ'
          );
        }}
      ]
    );
  };

  const handleRetry = () => {
    setError(null);
    initializeDriver();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>ドライバーモード初期化中...</Text>
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
            <Text style={styles.switchButtonText}>お客様モードに切り替え</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportButton} onPress={showDriverSupport}>
            <Text style={styles.supportButtonText}>ドライバーサポート</Text>
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
          <Text style={styles.title}>ドライバー</Text>
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

        {/* Online Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>運行状態</Text>
          <TouchableOpacity
            style={[styles.statusButton, { backgroundColor: isOnline ? '#4CAF50' : '#ff6b6b' }]}
            onPress={toggleOnlineStatus}
          >
            <Text style={styles.statusButtonText}>
              {isOnline ? 'オンライン - 配車待機中' : 'オフライン - タップしてオンライン'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings */}
        <View style={styles.earningsContainer}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsTitle}>本日の収益</Text>
            <TouchableOpacity onPress={showEarningsHelp}>
              <Text style={styles.earningsHelp}>ℹ️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.earningsAmount}>¥{earnings.today.toLocaleString()}</Text>
          <Text style={styles.earningsDetails}>
            完了回数: {earnings.rides}回 | 稼働時間: {earnings.hours}時間
          </Text>
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
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {/* Driver location */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="あなたの位置"
                pinColor={isOnline ? 'green' : 'gray'}
              />

              {/* High-demand stations */}
              {nearbyStations.map((station, index) => (
                <Marker
                  key={station.id || index}
                  coordinate={{
                    latitude: station.lat,
                    longitude: station.lon,
                  }}
                  title={station.name}
                  description="高需要エリア"
                  pinColor="orange"
                />
              ))}
            </MapView>
          </View>
        )}

        {/* Weather Alert */}
        {weather && (
          <View style={styles.weatherContainer}>
            <Text style={styles.weatherTitle}>{region}の天気情報</Text>
            <Text style={styles.weatherInfo}>
              {weather.current?.description || '情報取得中'} |
              気温: {weather.current?.temperature || '--'}°C
            </Text>
            {weather.current?.condition === 'rainy' && (
              <Text style={styles.weatherAlert}>
                ⚠️ 雨予報 - 需要増加が予想されます
              </Text>
            )}
          </View>
        )}

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>{prefecture}のAI推奨エリア</Text>
            {recommendations.slice(0, 3).map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>{rec.message}</Text>
                <Text style={styles.recommendationPriority}>
                  優先度: {rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Performance Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>今日のパフォーマンス</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnings.rides}</Text>
              <Text style={styles.statLabel}>完了回数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.9</Text>
              <Text style={styles.statLabel}>平均評価</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>98%</Text>
              <Text style={styles.statLabel}>完了率</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.lineButton} onPress={openLINESupport}>
            <Text style={styles.lineButtonText}>💬 ドライバーLINE相談</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportButton} onPress={showDriverSupport}>
            <Text style={styles.supportButtonText}>📞 ドライバーサポート</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={switchMode}>
            <Text style={styles.switchButtonText}>お客様モードに切り替え</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={backToSelection}>
            <Text style={styles.backButtonText}>モード選択に戻る</Text>
          </TouchableOpacity>
        </View>

        {/* Coverage Info */}
        <View style={styles.coverageContainer}>
          <Text style={styles.coverageText}>AI活用で収益30%向上</Text>
          <Text style={styles.coverageSubtext}>
            天気予測とエリア推奨により効率的な運行をサポート
          </Text>
          <TouchableOpacity style={styles.supportLinkButton} onPress={showDriverSupport}>
            <Text style={styles.supportLinkText}>ドライバー専用サポート</Text>
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
    backgroundColor: '#ff9500',
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
    backgroundColor: '#ff6b6b',
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
  statusContainer: {
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
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  earningsContainer: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 10,
  },
  earningsHelp: {
    fontSize: 16,
    color: 'white',
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  earningsDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  mapContainer: {
    height: 250,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  weatherContainer: {
    backgroundColor: '#e3f2fd',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    borderColor: '#2196F3',
    borderWidth: 1,
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
    marginBottom: 5,
  },
  weatherAlert: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: 'bold',
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
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  recommendationPriority: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  statsContainer: {
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
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  buttonContainer: {
    margin: 15,
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
  coverageContainer: {
    alignItems: 'center',
    padding: 20,
  },
  coverageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
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
    borderColor: '#ff9500',
    borderWidth: 1,
    borderRadius: 20,
  },
  supportLinkText: {
    color: '#ff9500',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default DriverScreen;
