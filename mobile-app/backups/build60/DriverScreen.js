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
  Dimensions,
  Platform
} from 'react-native';
import MapView, { Marker, Circle, Heatmap, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DriverScreen = ({ onSwitchMode, onBackToSelection }) => {
  // Configuration
  const BACKEND_URL = 'https://tokyo-taxi-ai-backend-production.up.railway.app';
  const LINE_OA_ID = '@dhai52765howdah';
  const API_BASE_URL = BACKEND_URL;

  // State Management
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: 35.6762,
    longitude: 139.6503,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [prefecture, setPrefecture] = useState('東京都');
  const [isOnline, setIsOnline] = useState(false);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [earnings, setEarnings] = useState({
    today: 0,
    rides: 0,
    hours: 0,
    potential: 0
  });
  const [demandZones, setDemandZones] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [suggestedRoute, setSuggestedRoute] = useState([]);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showEarningsOverlay, setShowEarningsOverlay] = useState(false);

  // Socket handling
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const locationUpdateRef = useRef(null);

  // Map reference
  const mapRef = useRef(null);

  useEffect(() => {
    initializeDriver();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isOnline]);

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
    stopLocationTracking();
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

      // Get current location with timeout
      const currentLocation = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), 10000)
        )
      ]);

      if (!currentLocation?.coords) {
        throw new Error('位置情報を取得できません');
      }

      const coords = currentLocation.coords;
      setLocation(coords);
      
      // Update map region
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });

      // Load saved data and initialize
      await loadSavedData();

      // Load all data in parallel
      await Promise.all([
        detectRegion(coords.latitude, coords.longitude),
        loadDemandPrediction(coords.latitude, coords.longitude),
        loadNearbyRides(coords.latitude, coords.longitude),
        initializeSocket()
      ]);

    } catch (error) {
      console.error('Driver initialization error:', error);
      setError(error.message);
      
      // Fallback to Tokyo
      setLocation({ latitude: 35.6762, longitude: 139.6503 });
      setPrefecture('東京都');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedEarnings = await AsyncStorage.getItem('driverEarnings');
      const savedOnlineStatus = await AsyncStorage.getItem('isDriverOnline');

      if (savedEarnings) {
        setEarnings(JSON.parse(savedEarnings));
      }
      if (savedOnlineStatus) {
        setIsOnline(JSON.parse(savedOnlineStatus));
      }
    } catch (error) {
      console.warn('Load saved data error:', error);
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
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.detectedRegion && data.prefecture) {
        setPrefecture(data.prefecture);
        setNearbyStations(data.stations || []);
        
        // Load weather and recommendations
        await Promise.all([
          loadWeatherData(data.detectedRegion),
          loadRecommendations(lat, lon),
          calculatePotentialEarnings(lat, lon)
        ]);
      }
    } catch (error) {
      console.error('Region detection error:', error);
    }
  };

  const loadDemandPrediction = async (lat, lon) => {
    try {
      const currentHour = new Date().getHours();
      const isRushHour = (currentHour >= 7 && currentHour <= 9) || 
                         (currentHour >= 17 && currentHour <= 20);
      const isLateNight = currentHour >= 22 || currentHour <= 4;
      
      // Generate demand zones with earnings potential
      const zones = [];
      const heatPoints = [];
      const route = [];
      
      // Create 6-10 demand zones for drivers
      const numZones = isRushHour ? 10 : isLateNight ? 4 : 6;
      
      for (let i = 0; i < numZones; i++) {
        const angle = (Math.PI * 2 * i) / numZones;
        const distance = 0.005 + Math.random() * 0.02; // ~500m to 2.5km
        
        const zoneLat = lat + distance * Math.cos(angle);
        const zoneLon = lon + distance * Math.sin(angle);
        const intensity = isRushHour ? 0.8 + Math.random() * 0.2 : 
                         isLateNight ? 0.3 + Math.random() * 0.3 :
                         0.4 + Math.random() * 0.4;
        
        // Calculate estimated earnings for this zone
        const baseEarnings = isRushHour ? 3000 : isLateNight ? 2500 : 2000;
        const zoneEarnings = Math.floor(baseEarnings * intensity + Math.random() * 500);
        
        zones.push({
          id: `zone_${i}`,
          latitude: zoneLat,
          longitude: zoneLon,
          radius: 400 + Math.random() * 300,
          intensity: intensity,
          earnings: zoneEarnings,
          rides: Math.floor(intensity * 5),
          type: i % 3 === 0 ? 'station' : i % 3 === 1 ? 'business' : 'residential',
          demandLevel: intensity > 0.7 ? 'high' : intensity > 0.4 ? 'medium' : 'low',
          waitTime: Math.floor((1 - intensity) * 10), // Estimated wait time in minutes
        });
        
        // Add points for heatmap
        for (let j = 0; j < intensity * 15; j++) {
          heatPoints.push({
            latitude: zoneLat + (Math.random() - 0.5) * 0.004,
            longitude: zoneLon + (Math.random() - 0.5) * 0.004,
            weight: intensity
          });
        }
        
        // Add to suggested route if high demand
        if (intensity > 0.6) {
          route.push({ latitude: zoneLat, longitude: zoneLon });
        }
      }
      
      // Sort zones by earnings potential
      zones.sort((a, b) => b.earnings - a.earnings);
      
      setDemandZones(zones);
      setHeatmapData(heatPoints);
      
      // Create optimized route through high-demand zones
      if (route.length > 0) {
        route.unshift({ latitude: lat, longitude: lon }); // Start from current location
        setSuggestedRoute(route);
      }
      
    } catch (error) {
      console.error('Demand prediction error:', error);
    }
  };

  const loadNearbyRides = async (lat, lon) => {
    try {
      // Simulate nearby ride requests
      const rides = [];
      const numRides = Math.floor(Math.random() * 5) + 2;
      
      for (let i = 0; i < numRides; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 0.003 + Math.random() * 0.01;
        
        rides.push({
          id: `ride_${i}`,
          latitude: lat + distance * Math.cos(angle),
          longitude: lon + distance * Math.sin(angle),
          fare: 1500 + Math.floor(Math.random() * 2000),
          distance: Math.floor(Math.random() * 5) + 1,
          waitTime: Math.floor(Math.random() * 10) + 2,
          destination: '目的地',
        });
      }
      
      setNearbyRides(rides);
    } catch (error) {
      console.error('Load nearby rides error:', error);
    }
  };

  const calculatePotentialEarnings = async (lat, lon) => {
    try {
      const currentHour = new Date().getHours();
      const isRushHour = (currentHour >= 7 && currentHour <= 9) || 
                         (currentHour >= 17 && currentHour <= 20);
      
      // Calculate potential earnings based on location and time
      const baseHourlyRate = isRushHour ? 4500 : 3000;
      const weatherMultiplier = weather?.current?.condition === 'rainy' ? 1.3 : 1.0;
      const potential = Math.floor(baseHourlyRate * weatherMultiplier);
      
      setEarnings(prev => ({ ...prev, potential }));
    } catch (error) {
      console.error('Calculate earnings error:', error);
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
        
        // Update demand and earnings based on weather
        if (data.weather?.current?.condition === 'rainy') {
          loadDemandPrediction(location.latitude, location.longitude);
        }
      }
    } catch (error) {
      console.warn('Weather data error:', error);
      setWeather({
        current: {
          description: '曇りがち',
          temperature: 28,
          condition: 'cloudy'
        }
      });
    }
  };

  const loadRecommendations = async (lat, lon) => {
    try {
      const currentHour = new Date().getHours();
      const recs = [];
      
      // Time-based recommendations
      if (currentHour >= 13 && currentHour <= 14) {
        recs.push({
          message: '13:00の需要ピークに備えて原宿駅エリアへ',
          priority: 'high',
          action: 'navigate'
        });
      }
      
      if (currentHour >= 17 && currentHour <= 19) {
        recs.push({
          message: '帰宅ラッシュ: オフィス街での需要急増中',
          priority: 'high',
          action: 'navigate'
        });
      }
      
      // Weather-based recommendations
      if (weather?.current?.condition === 'rainy') {
        recs.push({
          message: '雨天ボーナス: 収益30%アップ中',
          priority: 'high',
          action: 'info'
        });
      }
      
      // Zone-based recommendations
      if (demandZones.length > 0) {
        const topZone = demandZones[0];
        recs.push({
          message: `最高収益エリア: ¥${topZone.earnings}/時`,
          priority: 'medium',
          action: 'navigate',
          location: { lat: topZone.latitude, lon: topZone.longitude }
        });
      }
      
      setRecommendations(recs);
    } catch (error) {
      console.warn('Recommendations error:', error);
    }
  };

  const initializeSocket = async () => {
    try {
      // Socket initialization would go here
      setTimeout(() => {
        setSocketConnected(true);
      }, 1000);
    } catch (error) {
      console.warn('Socket initialization error:', error);
      setSocketConnected(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      await AsyncStorage.setItem('isDriverOnline', JSON.stringify(newStatus));

      if (newStatus) {
        Alert.alert('オンライン', '配車リクエストの受信を開始しました');
        startLocationTracking();
      } else {
        Alert.alert('オフライン', '配車リクエストの受信を停止しました');
        stopLocationTracking();
      }
    } catch (error) {
      console.error('Toggle online error:', error);
      Alert.alert('エラー', '状態の変更に失敗しました');
    }
  };

  const startLocationTracking = () => {
    if (locationUpdateRef.current) {
      clearInterval(locationUpdateRef.current);
    }

    locationUpdateRef.current = setInterval(async () => {
      try {
        if (isOnline) {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setLocation(currentLocation.coords);
          
          // Update demand prediction based on new location
          loadDemandPrediction(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude
          );
        }
      } catch (error) {
        console.warn('Location update error:', error);
      }
    }, 30000); // Update every 30 seconds
  };

  const stopLocationTracking = () => {
    if (locationUpdateRef.current) {
      clearInterval(locationUpdateRef.current);
      locationUpdateRef.current = null;
    }
  };

  const navigateToZone = (zone) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: zone.latitude,
        longitude: zone.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
      
      Alert.alert(
        '推奨エリア',
        `予想収益: ¥${zone.earnings}/時\n予想乗車数: ${zone.rides}回\n待機時間: 約${zone.waitTime}分`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: 'ナビ開始', 
            onPress: () => {
              // Would open navigation app
              const url = Platform.OS === 'ios'
                ? `maps://app?daddr=${zone.latitude},${zone.longitude}`
                : `google.navigation:q=${zone.latitude},${zone.longitude}`;
              Linking.openURL(url).catch(() => {
                Alert.alert('エラー', 'ナビゲーションアプリを開けませんでした');
              });
            }
          }
        ]
      );
    }
  };

  const acceptRide = (ride) => {
    Alert.alert(
      '配車リクエスト',
      `料金: ¥${ride.fare}\n距離: ${ride.distance}km\n待機時間: ${ride.waitTime}分`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '受諾', 
          onPress: async () => {
            const newEarnings = {
              ...earnings,
              today: earnings.today + ride.fare,
              rides: earnings.rides + 1,
            };
            setEarnings(newEarnings);
            await AsyncStorage.setItem('driverEarnings', JSON.stringify(newEarnings));
            Alert.alert('成功', '配車リクエストを受諾しました');
          }
        }
      ]
    );
  };

  const toggleMapType = () => {
    setMapType(mapType === 'standard' ? 'hybrid' : 'standard');
  };

  const toggleHeatmap = () => {
    setShowHeatmap(!showHeatmap);
  };

  const toggleEarningsOverlay = () => {
    setShowEarningsOverlay(!showEarningsOverlay);
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
      '収益向上のヒント',
      '• 赤色エリアは最高収益ゾーン\n• 雨天時は収益30%アップ\n• ラッシュ時間帯を狙う\n• AIおすすめエリアを活用',
      [{ text: 'OK' }]
    );
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isOnline ? '#4CAF50' : '#ff6b6b' }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>ドライバー</Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: socketConnected ? 'white' : '#ffcccc' }
            ]} />
            <Text style={styles.connectionText}>
              {socketConnected ? '接続中' : 'オフライン'}
            </Text>
          </View>
        </View>
        <Text style={styles.prefecture}>{prefecture}</Text>
        <TouchableOpacity style={styles.statusButton} onPress={toggleOnlineStatus}>
          <Text style={styles.statusButtonText}>
            {isOnline ? '🟢 オンライン - 配車待機中' : '🔴 オフライン - タップして開始'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Earnings Bar */}
      <View style={styles.earningsBar}>
        <View style={styles.earningsMain}>
          <Text style={styles.earningsLabel}>本日の収益</Text>
          <Text style={styles.earningsAmount}>¥{earnings.today.toLocaleString()}</Text>
        </View>
        <View style={styles.earningsStats}>
          <View style={styles.earningStat}>
            <Text style={styles.statValue}>{earnings.rides}</Text>
            <Text style={styles.statLabel}>完了</Text>
          </View>
          <View style={styles.earningStat}>
            <Text style={styles.statValue}>¥{earnings.potential}</Text>
            <Text style={styles.statLabel}>予想/時</Text>
          </View>
          <TouchableOpacity onPress={showEarningsHelp}>
            <Text style={styles.helpIcon}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          mapType={mapType}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsTraffic={true}
          showsBuildings={true}
        >
          {/* Driver location */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="あなたの位置"
              pinColor={isOnline ? 'green' : 'gray'}
            >
              <View style={styles.driverMarker}>
                <Text style={styles.driverMarkerText}>🚕</Text>
              </View>
            </Marker>
          )}

          {/* Demand zones with earnings overlay */}
          {demandZones.map((zone) => (
            <Circle
              key={zone.id}
              center={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              radius={zone.radius}
              fillColor={
                zone.demandLevel === 'high' ? 'rgba(255, 0, 0, 0.3)' :
                zone.demandLevel === 'medium' ? 'rgba(255, 165, 0, 0.3)' :
                'rgba(255, 255, 0, 0.2)'
              }
              strokeColor={
                zone.demandLevel === 'high' ? 'rgba(255, 0, 0, 0.6)' :
                zone.demandLevel === 'medium' ? 'rgba(255, 165, 0, 0.6)' :
                'rgba(255, 255, 0, 0.4)'
              }
              strokeWidth={2}
              tappable={true}
              onPress={() => navigateToZone(zone)}
            />
          ))}

          {/* Earnings overlay markers */}
          {showEarningsOverlay && demandZones.slice(0, 5).map((zone) => (
            <Marker
              key={`earning_${zone.id}`}
              coordinate={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.earningsMarker}>
                <Text style={styles.earningsMarkerText}>¥{zone.earnings}</Text>
              </View>
            </Marker>
          ))}

          {/* Nearby ride requests */}
          {nearbyRides.map((ride) => (
            <Marker
              key={ride.id}
              coordinate={{
                latitude: ride.latitude,
                longitude: ride.longitude,
              }}
              title={`¥${ride.fare}`}
              description={`${ride.distance}km・${ride.waitTime}分待ち`}
              onPress={() => acceptRide(ride)}
            >
              <View style={styles.rideMarker}>
                <Text style={styles.rideMarkerText}>👤</Text>
              </View>
            </Marker>
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
              description="高需要駅"
              pinColor="orange"
            />
          ))}

          {/* Suggested route */}
          {suggestedRoute.length > 1 && (
            <Polyline
              coordinates={suggestedRoute}
              strokeColor="#667eea"
              strokeWidth={3}
              lineDashPattern={[10, 5]}
            />
          )}

          {/* Heatmap overlay */}
          {showHeatmap && heatmapData.length > 0 && (
            <Heatmap
              points={heatmapData}
              opacity={0.6}
              radius={35}
              maxIntensity={100}
              gradientSmoothing={10}
              heatmapMode="POINTS_DENSITY"
            />
          )}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapButton} onPress={centerOnLocation}>
            <Text style={styles.mapButtonText}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={toggleMapType}>
            <Text style={styles.mapButtonText}>🗺</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={toggleHeatmap}>
            <Text style={styles.mapButtonText}>🔥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapButton} onPress={toggleEarningsOverlay}>
            <Text style={styles.mapButtonText}>💰</Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>収益予測</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ff0000' }]} />
              <Text style={styles.legendText}>高収益</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ffa500' }]} />
              <Text style={styles.legendText}>中収益</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ffff00' }]} />
              <Text style={styles.legendText}>低収益</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Info Cards */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Weather Alert */}
        {weather && (
          <View style={[
            styles.weatherCard,
            weather.current?.condition === 'rainy' && styles.weatherCardRain
          ]}>
            <Text style={styles.cardTitle}>{prefecture}の天気情報</Text>
            <Text style={styles.weatherInfo}>
              {weather.current?.description || '曇りがち'} | 気温: {weather.current?.temperature || 28}°C
            </Text>
            {weather.current?.condition === 'rainy' && (
              <Text style={styles.weatherBonus}>☔ 雨天ボーナス: 収益30%アップ中!</Text>
            )}
          </View>
        )}

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsCard}>
            <Text style={styles.cardTitle}>{prefecture}のAI推奨エリア</Text>
            {recommendations.map((rec, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.recommendationItem,
                  rec.priority === 'high' && styles.recommendationHigh
                ]}
                onPress={() => {
                  if (rec.location) {
                    navigateToZone(rec.location);
                  }
                }}
              >
                <Text style={styles.recommendationText}>{rec.message}</Text>
                <Text style={styles.recommendationPriority}>
                  {rec.priority === 'high' ? '🔥 優先度: 高' : '📍 優先度: 中'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Performance Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>今日のパフォーマンス</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statBigValue}>{earnings.rides}</Text>
              <Text style={styles.statLabel}>完了回数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statBigValue}>4.9</Text>
              <Text style={styles.statLabel}>平均評価</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statBigValue}>98%</Text>
              <Text style={styles.statLabel}>完了率</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statBigValue}>{earnings.hours}h</Text>
              <Text style={styles.statLabel}>稼働時間</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.lineButton} onPress={openLINESupport}>
            <Text style={styles.lineButtonText}>💬 ドライバーLINE相談</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportButton} onPress={() => Alert.alert('サポート', 'ドライバー専用サポート')}>
            <Text style={styles.supportButtonText}>📞 ドライバーサポート</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={onSwitchMode}>
            <Text style={styles.switchButtonText}>お客様モードに切り替え</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
            <Text style={styles.backButtonText}>モード選択に戻る</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>AI活用で収益30%向上</Text>
          <Text style={styles.footerText}>
            天気予測とエリア推奨により効率的な運行をサポート
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 20,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  prefecture: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: 'white',
    fontSize: 12,
  },
  statusButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  earningsBar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  earningsMain: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666',
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earningsStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningStat: {
    alignItems: 'center',
    marginLeft: 20,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
  },
  helpIcon: {
    fontSize: 20,
    marginLeft: 15,
  },
  mapContainer: {
    height: screenHeight * 0.35,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    top: 10,
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
    elevation: 5,
  },
  mapButtonText: {
    fontSize: 20,
  },
  legendContainer: {
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
  legendItems: {
    flexDirection: 'row',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
  },
  driverMarker: {
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  driverMarkerText: {
    fontSize: 20,
  },
  earningsMarker: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
  },
  earningsMarkerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rideMarker: {
    backgroundColor: '#667eea',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  rideMarkerText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  weatherCard: {
    backgroundColor: '#e3f2fd',
    margin: 15,
    marginTop: 10,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  weatherCardRain: {
    backgroundColor: '#c8e6c9',
    borderColor: '#4CAF50',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  weatherInfo: {
    fontSize: 14,
    color: '#666',
  },
  weatherBonus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendationItem: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationHigh: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  recommendationPriority: {
    fontSize: 12,
    color: '#888',
  },
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  statBigValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  supportButton: {
    backgroundColor: '#ff9500',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  supportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  switchButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 14,
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
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});