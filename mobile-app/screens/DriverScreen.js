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
  Linking,
  Dimensions
} from 'react-native';
import MapView, { Marker, Circle, Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

const DriverScreen = ({ onSwitchMode, onBackToSelection }) => {
  // Configuration
  const BACKEND_URL = 'https://tokyo-taxi-ai-backend-production.up.railway.app';
  const LINE_OA_ID = '@dhai52765howdah';
  const API_BASE_URL = BACKEND_URL;

  // Fix: Provide default props
  const switchMode = onSwitchMode || (() => console.warn('onSwitchMode not provided'));
  const backToSelection = onBackToSelection || (() => console.warn('onBackToSelection not provided'));

  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState('tokyo');
  const [prefecture, setPrefecture] = useState('東京都');
  const [isOnline, setIsOnline] = useState(false);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherForecast, setWeatherForecast] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [earningsZones, setEarningsZones] = useState([]);
  const [earnings, setEarnings] = useState({
    today: 0,
    rides: 0,
    hours: 0,
    avgPerRide: 0,
    peakEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [showEarningsHeatmap, setShowEarningsHeatmap] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [hotspots, setHotspots] = useState([]);

  // Polling intervals
  const connectionCheckRef = useRef(null);
  const locationUpdateRef = useRef(null);
  const earningsUpdateRef = useRef(null);

  useEffect(() => {
    initializeDriver();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (isOnline && location) {
      startLocationUpdates();
      startEarningsUpdates();
      generateEarningsZones();
    } else {
      stopLocationUpdates();
      stopEarningsUpdates();
    }
    return () => {
      stopLocationUpdates();
      stopEarningsUpdates();
    };
  }, [isOnline, location]);

  const cleanup = () => {
    if (connectionCheckRef.current) clearInterval(connectionCheckRef.current);
    if (locationUpdateRef.current) clearInterval(locationUpdateRef.current);
    if (earningsUpdateRef.current) clearInterval(earningsUpdateRef.current);
  };

  const initializeDriver = async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('位置情報の許可が必要です');
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      if (!currentLocation?.coords) {
        throw new Error('位置情報を取得できません');
      }

      setLocation(currentLocation.coords);
      await loadSavedData();
      await detectRegion(currentLocation.coords.latitude, currentLocation.coords.longitude);
      
      // Start connection monitoring
      startConnectionCheck();
      
      // Generate initial earnings zones
      generateEarningsZones();

    } catch (error) {
      console.error('Driver initialization error:', error);
      setError(error.message);
      setLocation({ latitude: 35.6762, longitude: 139.6503 });
      setRegion('tokyo');
      setPrefecture('東京都');
    } finally {
      setLoading(false);
    }
  };

  const startConnectionCheck = () => {
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE_URL}/health`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setConnectionStatus(response.ok ? 'connected' : 'offline');
      } catch (error) {
        setConnectionStatus('offline');
      }
    };

    checkConnection();
    connectionCheckRef.current = setInterval(checkConnection, 30000);
  };

  const generateEarningsZones = () => {
    if (!location) return;

    const currentHour = new Date().getHours();
    const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 20);
    const isNightTime = currentHour >= 22 || currentHour <= 5;
    
    // Generate earnings potential zones
    const zones = [];
    const baseEarnings = isRushHour ? 3000 : isNightTime ? 2500 : 1800;
    
    // High earnings zones near stations
    nearbyStations.forEach((station, index) => {
      const multiplier = isRushHour ? 1.5 : isNightTime ? 1.3 : 1.0;
      zones.push({
        id: `station_${index}`,
        latitude: station.lat,
        longitude: station.lon,
        earnings: Math.floor(baseEarnings * multiplier * (1 + Math.random() * 0.3)),
        radius: 500,
        color: 'rgba(76, 175, 80, 0.3)',
        name: station.name,
        type: 'station',
        rides: Math.floor(3 + Math.random() * 5)
      });
    });

    // Business district zones (higher earnings during weekdays)
    const businessZones = [
      { lat: location.latitude + 0.01, lon: location.longitude + 0.01, name: 'ビジネス街' },
      { lat: location.latitude - 0.008, lon: location.longitude + 0.012, name: 'オフィス街' }
    ];

    businessZones.forEach((zone, index) => {
      const multiplier = isRushHour ? 1.8 : 1.2;
      zones.push({
        id: `business_${index}`,
        latitude: zone.lat,
        longitude: zone.lon,
        earnings: Math.floor(baseEarnings * multiplier),
        radius: 800,
        color: 'rgba(255, 152, 0, 0.3)',
        name: zone.name,
        type: 'business',
        rides: Math.floor(4 + Math.random() * 6)
      });
    });

    // Entertainment zones (higher earnings at night)
    if (isNightTime) {
      zones.push({
        id: 'entertainment_1',
        latitude: location.latitude + 0.015,
        longitude: location.longitude - 0.01,
        earnings: Math.floor(baseEarnings * 1.6),
        radius: 600,
        color: 'rgba(156, 39, 176, 0.3)',
        name: '繁華街',
        type: 'entertainment',
        rides: Math.floor(5 + Math.random() * 7)
      });
    }

    setEarningsZones(zones);
    
    // Update hotspots for heatmap
    const heatmapPoints = zones.map(zone => ({
      latitude: zone.latitude,
      longitude: zone.longitude,
      weight: zone.earnings / 1000
    }));
    setHotspots(heatmapPoints);
    
    // Calculate surge based on demand
    const avgEarnings = zones.reduce((sum, z) => sum + z.earnings, 0) / zones.length;
    const surge = avgEarnings > 2500 ? 1.3 : avgEarnings > 2000 ? 1.2 : 1.0;
    setSurgeMultiplier(surge);
  };

  const startEarningsUpdates = () => {
    earningsUpdateRef.current = setInterval(() => {
      generateEarningsZones();
      // Simulate earnings growth when online
      if (isOnline) {
        setEarnings(prev => ({
          ...prev,
          hours: prev.hours + 0.5,
          avgPerRide: Math.floor((prev.today / (prev.rides || 1)))
        }));
      }
    }, 60000); // Update every minute
  };

  const stopEarningsUpdates = () => {
    if (earningsUpdateRef.current) {
      clearInterval(earningsUpdateRef.current);
      earningsUpdateRef.current = null;
    }
  };

  const detectRegion = async (lat, lon) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `${API_BASE_URL}/api/stations/nearby-regional?lat=${lat}&lon=${lon}&radius=2`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();

      if (data.detectedRegion && data.prefecture) {
        setRegion(data.detectedRegion);
        setPrefecture(data.prefecture);
        setNearbyStations(data.stations || []);

        await saveToStorage('driverRegion', data.detectedRegion);
        await saveToStorage('driverPrefecture', data.prefecture);

        await Promise.all([
          loadWeatherData(data.detectedRegion),
          loadRecommendations(lat, lon),
          loadWeatherForecast(data.detectedRegion)
        ]);
      }
    } catch (error) {
      console.error('Region detection error:', error);
      await loadSavedRegion();
    }
  };

  const loadWeatherData = async (regionName) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `${API_BASE_URL}/api/weather/forecast-regional?region=${regionName}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setWeather(data.weather);
      }
    } catch (error) {
      console.warn('Weather data error:', error);
    }
  };

  const loadWeatherForecast = async (regionName) => {
    // Simulate hourly forecast for earnings prediction
    const forecast = [];
    const currentTemp = weather?.current?.temperature || 20;
    
    for (let i = 0; i < 6; i++) {
      const hour = new Date();
      hour.setHours(hour.getHours() + i);
      
      const willRain = Math.random() > 0.7;
      forecast.push({
        time: `${hour.getHours()}:00`,
        temp: Math.floor(currentTemp + Math.random() * 5 - 2),
        condition: willRain ? '☔' : '☀️',
        precipitation: willRain ? Math.floor(Math.random() * 10) : 0,
        demandBoost: willRain ? '+30%' : '通常'
      });
    }
    
    setWeatherForecast(forecast);
  };

  const loadRecommendations = async (lat, lon) => {
    if (!lat || !lon) return;

    // Generate AI recommendations based on current conditions
    const currentHour = new Date().getHours();
    const recs = [];
    
    if (currentHour >= 6 && currentHour <= 9) {
      recs.push({
        message: '🚉 駅周辺で高需要予測。平均収益¥2,500/配車',
        priority: 'high',
        action: '最寄り駅へ移動'
      });
    }
    
    if (weather?.current?.condition === 'rainy' || weatherForecast.some(f => f.precipitation > 5)) {
      recs.push({
        message: '☔ 雨予報で需要30%増加見込み',
        priority: 'high',
        action: '商業エリアで待機'
      });
    }
    
    if (surgeMultiplier > 1.2) {
      recs.push({
        message: `💰 現在サージ料金${surgeMultiplier}x適用中`,
        priority: 'medium',
        action: 'オンライン維持推奨'
      });
    }
    
    // Add zone-specific recommendations
    if (earningsZones.length > 0) {
      const bestZone = earningsZones.reduce((best, zone) => 
        zone.earnings > (best?.earnings || 0) ? zone : best
      );
      
      if (bestZone) {
        recs.push({
          message: `📍 ${bestZone.name}で最高収益¥${bestZone.earnings}/時`,
          priority: 'high',
          action: `${bestZone.name}へ移動`
        });
      }
    }
    
    setRecommendations(recs);
  };

  const saveToStorage = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Storage save error for ${key}:`, error);
    }
  };

  const loadFromStorage = async (key, defaultValue = null) => {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`Storage load error for ${key}:`, error);
      return defaultValue;
    }
  };

  const loadSavedData = async () => {
    try {
      const savedEarnings = await loadFromStorage('driverEarnings', { 
        today: 0, rides: 0, hours: 0, avgPerRide: 0, peakEarnings: 0 
      });
      const savedOnlineStatus = await loadFromStorage('isDriverOnline', false);

      setEarnings(savedEarnings);
      setIsOnline(savedOnlineStatus);
    } catch (error) {
      console.warn('Load saved data error:', error);
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

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      await saveToStorage('isDriverOnline', newStatus);

      if (newStatus && location) {
        startLocationUpdates();
        Alert.alert('オンライン', '配車リクエスト受付開始');
      } else {
        stopLocationUpdates();
        Alert.alert('オフライン', '配車リクエスト受付停止');
      }
    } catch (error) {
      console.error('Toggle online error:', error);
      Alert.alert('エラー', '状態の変更に失敗しました');
    }
  };

  const startLocationUpdates = () => {
    if (locationUpdateRef.current) clearInterval(locationUpdateRef.current);

    locationUpdateRef.current = setInterval(async () => {
      try {
        if (isOnline) {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(currentLocation.coords);
        }
      } catch (error) {
        console.warn('Location update error:', error);
      }
    }, 30000);
  };

  const stopLocationUpdates = () => {
    if (locationUpdateRef.current) {
      clearInterval(locationUpdateRef.current);
      locationUpdateRef.current = null;
    }
  };

  const acceptRide = async (zone) => {
    const fare = zone.earnings;
    const newEarnings = {
      today: earnings.today + fare,
      rides: earnings.rides + 1,
      hours: earnings.hours,
      avgPerRide: Math.floor((earnings.today + fare) / (earnings.rides + 1)),
      peakEarnings: Math.max(earnings.peakEarnings, fare)
    };

    setEarnings(newEarnings);
    await saveToStorage('driverEarnings', newEarnings);

    Alert.alert(
      '配車確定',
      `${zone.name}エリア\n予想収益: ¥${fare}\n推定配車数: ${zone.rides}件`,
      [{ text: 'OK' }]
    );
  };

  const openLINESupport = async () => {
    try {
      const lineURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
      await Linking.openURL(lineURL);
    } catch (error) {
      Alert.alert('エラー', `LINE ID: ${LINE_OA_ID}`);
    }
  };

  const showEarningsHelp = () => {
    Alert.alert(
      'AI収益最適化',
      '🔴 赤: 高収益 (¥3,000+/時)\n🟠 橙: 中収益 (¥2,000-3,000/時)\n🟡 黄: 通常 (¥1,500-2,000/時)\n\n☔ 雨天時は需要30%増\n🚉 駅周辺は朝夕ピーク\n🌃 深夜は料金割増',
      [
        { text: '閉じる', style: 'cancel' },
        { text: 'LINE相談', onPress: openLINESupport }
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
          <ActivityIndicator size="large" color="#ff6b6b" />
          <Text style={styles.loadingText}>ドライバーモード初期化中...</Text>
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
              { backgroundColor: connectionStatus === 'connected' ? '#4CAF50' : '#ff6b6b' }
            ]} />
            <Text style={styles.connectionText}>
              {connectionStatus === 'connected' ? '接続済み' : 'オフライン'}
            </Text>
          </View>
        </View>

        {/* Online Status Toggle */}
        <View style={styles.statusContainer}>
          <TouchableOpacity
            style={[styles.statusButton, { backgroundColor: isOnline ? '#4CAF50' : '#ff6b6b' }]}
            onPress={toggleOnlineStatus}
          >
            <Text style={styles.statusButtonText}>
              {isOnline ? '営業中 - タップでオフライン' : 'オフライン - タップで営業開始'}
            </Text>
          </TouchableOpacity>
          {surgeMultiplier > 1.0 && (
            <Text style={styles.surgeText}>サージ料金 {surgeMultiplier}x 適用中</Text>
          )}
        </View>

        {/* Earnings Dashboard */}
        <View style={styles.earningsContainer}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsTitle}>本日の収益</Text>
            <TouchableOpacity onPress={showEarningsHelp}>
              <Text style={styles.earningsHelp}>ℹ️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.earningsAmount}>¥{earnings.today.toLocaleString()}</Text>
          <View style={styles.earningsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnings.rides}</Text>
              <Text style={styles.statLabel}>配車</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{earnings.avgPerRide}</Text>
              <Text style={styles.statLabel}>平均</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{earnings.peakEarnings}</Text>
              <Text style={styles.statLabel}>最高</Text>
            </View>
          </View>
        </View>

        {/* Map with Earnings Heatmap */}
        {location && (
          <View style={styles.mapWrapper}>
            <View style={styles.mapControls}>
              <TouchableOpacity 
                style={styles.mapControlButton}
                onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
              >
                <Text>🗺</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.mapControlButton}
                onPress={() => setShowEarningsHeatmap(!showEarningsHeatmap)}
              >
                <Text>💰</Text>
              </TouchableOpacity>
            </View>
            
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              mapType={mapType}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsTraffic={true}
              onMapReady={() => setMapReady(true)}
            >
              {/* Driver location */}
              {mapReady && (
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="現在地"
                  pinColor={isOnline ? 'green' : 'gray'}
                />
              )}

              {/* Earnings zones */}
              {mapReady && showEarningsHeatmap && earningsZones.map((zone) => (
                <React.Fragment key={zone.id}>
                  <Circle
                    center={{
                      latitude: zone.latitude,
                      longitude: zone.longitude,
                    }}
                    radius={zone.radius}
                    fillColor={zone.color}
                    strokeColor={zone.color.replace('0.3', '0.8')}
                    strokeWidth={2}
                  />
                  <Marker
                    coordinate={{
                      latitude: zone.latitude,
                      longitude: zone.longitude,
                    }}
                    onPress={() => acceptRide(zone)}
                  >
                    <View style={styles.earningsMarker}>
                      <Text style={styles.earningsMarkerText}>¥{zone.earnings}</Text>
                      <Text style={styles.earningsMarkerSubtext}>{zone.rides}件</Text>
                    </View>
                  </Marker>
                </React.Fragment>
              ))}

              {/* Heatmap overlay */}
              {mapReady && showEarningsHeatmap && hotspots.length > 0 && (
                <Heatmap
                  points={hotspots}
                  opacity={0.5}
                  radius={30}
                  maxIntensity={100}
                  gradient={{
                    colors: ['#00ff00', '#ffff00', '#ff0000'],
                    startPoints: [0.2, 0.5, 1.0],
                    colorMapSize: 256
                  }}
                />
              )}
            </MapView>

            {/* Earnings Legend */}
            {showEarningsHeatmap && (
              <View style={styles.mapLegend}>
                <Text style={styles.legendTitle}>収益予測</Text>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(76, 175, 80, 0.6)' }]} />
                  <Text style={styles.legendText}>駅: ¥2,500+</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 152, 0, 0.6)' }]} />
                  <Text style={styles.legendText}>ビジネス: ¥2,000+</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(156, 39, 176, 0.6)' }]} />
                  <Text style={styles.legendText}>繁華街: ¥3,000+</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Weather Forecast for Earnings */}
        {weatherForecast.length > 0 && (
          <View style={styles.forecastContainer}>
            <Text style={styles.forecastTitle}>収益予測 (天気連動)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {weatherForecast.map((hour, index) => (
                <View key={index} style={styles.forecastItem}>
                  <Text style={styles.forecastTime}>{hour.time}</Text>
                  <Text style={styles.forecastIcon}>{hour.condition}</Text>
                  <Text style={styles.forecastTemp}>{hour.temp}°</Text>
                  <Text style={[
                    styles.forecastDemand,
                    { color: hour.demandBoost === '+30%' ? '#4CAF50' : '#666' }
                  ]}>
                    {hour.demandBoost}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>AI収益最適化アドバイス</Text>
            {recommendations.map((rec, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.recommendationItem,
                  { borderLeftColor: rec.priority === 'high' ? '#ff6b6b' : '#ffa500' }
                ]}
                onPress={() => Alert.alert('推奨アクション', rec.action)}
              >
                <Text style={styles.recommendationText}>{rec.message}</Text>
                <Text style={styles.recommendationAction}>→ {rec.action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Performance Metrics */}
        <View style={styles.performanceContainer}>
          <Text style={styles.performanceTitle}>パフォーマンス</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{earnings.hours.toFixed(1)}h</Text>
              <Text style={styles.performanceLabel}>稼働時間</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>
                ¥{Math.floor(earnings.today / (earnings.hours || 1))}
              </Text>
              <Text style={styles.performanceLabel}>時給</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>4.9</Text>
              <Text style={styles.performanceLabel}>評価</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>98%</Text>
              <Text style={styles.performanceLabel}>完了率</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.lineButton} onPress={openLINESupport}>
            <Text style={styles.lineButtonText}>💬 ドライバーサポート</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={switchMode}>
            <Text style={styles.switchButtonText}>お客様モードに切り替え</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={backToSelection}>
            <Text style={styles.backButtonText}>モード選択に戻る</Text>
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
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
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
  },
  retryButtonText: {
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
  surgeText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  earningsContainer: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 20,
    borderRadius: 10,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  earningsHelp: {
    fontSize: 20,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  mapWrapper: {
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    flexDirection: 'column',
    gap: 10,
  },
  mapControlButton: {
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 10,
  },
  map: {
    height: 350,
  },
  earningsMarker: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  earningsMarkerText: {
    fontWeight: 'bold',
    color: '#4CAF50',
    fontSize: 12,
  },
  earningsMarkerSubtext: {
    fontSize: 10,
    color: '#666',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 10,
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendColor: {
    width: 20,
    height: 10,
    borderRadius: 2,
    marginRight: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  forecastContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  forecastTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  forecastItem: {
    alignItems: 'center',
    marginRight: 20,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  forecastTime: {
    fontSize: 12,
    color: '#666',
  },
  forecastIcon: {
    fontSize: 24,
    marginVertical: 5,
  },
  forecastTemp: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  forecastDemand: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  recommendationsContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
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
    borderLeftWidth: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  recommendationAction: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  performanceContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  performanceItem: {
    width: '45%',
    alignItems: 'center',
    marginBottom: 15,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  buttonContainer: {
    margin: 15,
  },
  lineButton: {
    backgroundColor: '#00C300',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  lineButtonText: {
    color: 'white',
    fontSize: 16,
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
});

export default DriverScreen;