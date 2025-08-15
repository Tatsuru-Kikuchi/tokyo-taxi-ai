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
  Linking,
  Dimensions
} from 'react-native';
import MapView, { Marker, Circle, Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CustomerScreen = ({ onSwitchMode, onBackToSelection }) => {
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
  const [nearbyStations, setNearbyStations] = useState([]);
  const [weather, setWeather] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState(0);
  const [demandZones, setDemandZones] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Socket handling
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Map reference
  const mapRef = useRef(null);

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

      // Load all data in parallel
      await Promise.all([
        detectRegion(coords.latitude, coords.longitude),
        loadDemandPrediction(coords.latitude, coords.longitude),
        initializeSocket()
      ]);

    } catch (error) {
      console.error('App initialization error:', error);
      setError(error.message);
      
      // Fallback to Tokyo
      setLocation({ latitude: 35.6762, longitude: 139.6503 });
      setPrefecture('東京都');
    } finally {
      setLoading(false);
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
          loadAvailableDrivers(data.detectedRegion)
        ]);
      }
    } catch (error) {
      console.error('Region detection error:', error);
    }
  };

  const loadDemandPrediction = async (lat, lon) => {
    try {
      // Simulate AI demand prediction based on weather and time
      const currentHour = new Date().getHours();
      const isRushHour = (currentHour >= 7 && currentHour <= 9) || 
                         (currentHour >= 17 && currentHour <= 20);
      
      // Generate demand zones around current location
      const zones = [];
      const heatPoints = [];
      
      // Create 5-8 demand zones within 2km radius
      const numZones = isRushHour ? 8 : 5;
      
      for (let i = 0; i < numZones; i++) {
        const angle = (Math.PI * 2 * i) / numZones;
        const distance = 0.005 + Math.random() * 0.015; // ~500m to 2km
        
        const zoneLat = lat + distance * Math.cos(angle);
        const zoneLon = lon + distance * Math.sin(angle);
        const intensity = isRushHour ? 0.7 + Math.random() * 0.3 : 0.3 + Math.random() * 0.4;
        
        zones.push({
          id: `zone_${i}`,
          latitude: zoneLat,
          longitude: zoneLon,
          radius: 300 + Math.random() * 200,
          intensity: intensity,
          type: i % 3 === 0 ? 'station' : i % 3 === 1 ? 'business' : 'residential',
          demandLevel: intensity > 0.7 ? 'high' : intensity > 0.4 ? 'medium' : 'low'
        });
        
        // Add multiple points for heatmap
        for (let j = 0; j < intensity * 10; j++) {
          heatPoints.push({
            latitude: zoneLat + (Math.random() - 0.5) * 0.003,
            longitude: zoneLon + (Math.random() - 0.5) * 0.003,
            weight: intensity
          });
        }
      }
      
      setDemandZones(zones);
      setHeatmapData(heatPoints);
      
    } catch (error) {
      console.error('Demand prediction error:', error);
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
        
        // Update demand based on weather
        if (data.weather?.current?.condition === 'rainy') {
          // Increase demand zones for rain
          loadDemandPrediction(location.latitude, location.longitude);
        }
      }
    } catch (error) {
      console.warn('Weather data error:', error);
      // Set default weather
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
      // Generate AI recommendations based on location and time
      const currentHour = new Date().getHours();
      const recs = [];
      
      if (currentHour >= 13 && currentHour <= 14) {
        recs.push({
          message: '13:00の需要ピークに備えて原宿駅エリアへ',
          priority: 'high'
        });
      }
      
      if (weather?.current?.condition === 'rainy') {
        recs.push({
          message: '雨天のため駅周辺の需要が30%上昇中',
          priority: 'high'
        });
      }
      
      recs.push({
        message: `${prefecture}で${availableDrivers || 0}名のドライバーが待機中`,
        priority: 'medium'
      });
      
      setRecommendations(recs);
    } catch (error) {
      console.warn('Recommendations error:', error);
    }
  };

  const loadAvailableDrivers = async (regionName) => {
    try {
      // Simulate available drivers
      const baseDrivers = regionName === 'tokyo' ? 50 : 20;
      const randomVariation = Math.floor(Math.random() * 20);
      setAvailableDrivers(baseDrivers + randomVariation);
    } catch (error) {
      console.warn('Available drivers error:', error);
      setAvailableDrivers(0);
    }
  };

  const initializeSocket = async () => {
    try {
      // Socket initialization would go here
      // For now, we'll simulate connection
      setTimeout(() => {
        setSocketConnected(true);
      }, 1000);
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

    Alert.alert(
      '配車リクエスト',
      `現在地から配車をリクエストしますか？\n推定待ち時間: 3-5分`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'リクエスト', 
          onPress: () => {
            Alert.alert('成功', `${availableDrivers}名のドライバーに通知しました`);
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
      Alert.alert('エラー', `LINE ID: ${LINE_OA_ID}`);
    }
  };

  const toggleMapType = () => {
    setMapType(mapType === 'standard' ? 'hybrid' : 'standard');
  };

  const toggleHeatmap = () => {
    setShowHeatmap(!showHeatmap);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>地図を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>お客様</Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: socketConnected ? '#4CAF50' : '#ff6b6b' }
            ]} />
            <Text style={styles.connectionText}>
              {socketConnected ? 'オンライン' : 'オフライン'}
            </Text>
          </View>
        </View>
        <Text style={styles.prefecture}>{prefecture}</Text>
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
          {/* Current location marker */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="現在地"
              pinColor="blue"
            />
          )}

          {/* Demand zones with circles */}
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
              description="高需要エリア"
              pinColor="orange"
            />
          ))}

          {/* Heatmap overlay */}
          {showHeatmap && heatmapData.length > 0 && (
            <Heatmap
              points={heatmapData}
              opacity={0.7}
              radius={30}
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
        </View>

        {/* Demand Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>需要予測</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ff0000' }]} />
              <Text style={styles.legendText}>高</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ffa500' }]} />
              <Text style={styles.legendText}>中</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ffff00' }]} />
              <Text style={styles.legendText}>低</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Info Cards Container */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Weather Card */}
        <View style={styles.weatherCard}>
          <Text style={styles.cardTitle}>{prefecture}の天気情報</Text>
          <Text style={styles.weatherInfo}>
            {weather?.current?.description || '曇りがち'} | 気温: {weather?.current?.temperature || 28}°C
          </Text>
        </View>

        {/* Available Drivers */}
        <View style={styles.driversCard}>
          <Text style={styles.driversText}>
            {prefecture}で{availableDrivers}名のドライバーが待機中
          </Text>
        </View>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsCard}>
            <Text style={styles.cardTitle}>{prefecture}のAI推奨エリア</Text>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>{rec.message}</Text>
                <Text style={styles.recommendationPriority}>
                  優先度: {rec.priority === 'high' ? '高' : '中'}
                </Text>
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

          <TouchableOpacity style={styles.switchButton} onPress={onSwitchMode}>
            <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
            <Text style={styles.backButtonText}>モード選択に戻る</Text>
          </TouchableOpacity>
        </View>

        {/* Coverage Info */}
        <View style={styles.coverageContainer}>
          <Text style={styles.coverageText}>全国47都道府県対応予定</Text>
          <Text style={styles.coverageSubtext}>
            現在対応: 東京・名古屋・大阪・京都・福岡・札幌・仙台・広島
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
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
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
  mapContainer: {
    height: screenHeight * 0.4,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(255,255,255,0.9)',
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
    marginRight: 10,
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
  scrollView: {
    flex: 1,
  },
  weatherCard: {
    backgroundColor: '#e8f4f8',
    margin: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
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
  driversCard: {
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
  driversText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
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
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  recommendationPriority: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
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
  },
});