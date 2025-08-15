import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Animated, Dimensions, ActivityIndicator, Switch
} from 'react-native';
import MapView, { Marker, Heatmap, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = 'https://tokyo-taxi-ai-backend.railway.app';

export default function DriverScreenEnhanced() {
  const [location, setLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0 });
  const [demandHeatmap, setDemandHeatmap] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [revenuePredictor, setRevenuePredictor] = useState(null);
  const [surgeAreas, setSurgeAreas] = useState([]);
  const [predictedEarnings, setPredictedEarnings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  const socket = useRef(null);
  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeDriver();
    startPulseAnimation();
    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (location) {
      fetchWeatherData();
      fetchTrafficData();
      calculateRevenuePredictions();
      fetchDemandPredictions();
    }
  }, [location]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const initializeDriver = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('エラー', '位置情報の許可が必要です');
        return;
      }

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            speed: newLocation.coords.speed,
            heading: newLocation.coords.heading,
          });
        }
      );

      // Initialize WebSocket
      socket.current = io(BACKEND_URL);
      
      socket.current.on('connect', () => {
        console.log('Connected to server');
      });

      socket.current.on('newRideRequest', (ride) => {
        handleNewRideRequest(ride);
      });

      socket.current.on('demandUpdate', (data) => {
        setDemandHeatmap(data.heatmap);
        setSurgeAreas(data.surgeAreas);
      });

      socket.current.on('aiSuggestion', (suggestion) => {
        setAiSuggestions(prev => [suggestion, ...prev].slice(0, 5));
      });
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/weather?lat=${location.latitude}&lon=${location.longitude}`
      );
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const fetchTrafficData = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/traffic?lat=${location.latitude}&lon=${location.longitude}`
      );
      const data = await response.json();
      setTrafficData(data);
    } catch (error) {
      console.error('Traffic fetch error:', error);
    }
  };

  const calculateRevenuePredictions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/revenue-predictor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          weather: weatherData,
          traffic: trafficData,
          dayOfWeek: new Date().getDay(),
          hour: new Date().getHours(),
        }),
      });
      const predictions = await response.json();
      setPredictedEarnings(predictions);
    } catch (error) {
      console.error('Revenue prediction error:', error);
    }
  };

  const fetchDemandPredictions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/demand-predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          weather: weatherData,
          time: new Date().toISOString(),
        }),
      });
      const data = await response.json();
      
      // Convert to heatmap format
      const heatmapData = data.predictions.map(pred => ({
        latitude: pred.lat,
        longitude: pred.lng,
        weight: pred.demandScore * 100,
      }));
      
      setDemandHeatmap(heatmapData);
    } catch (error) {
      console.error('Demand prediction error:', error);
    }
  };

  const handleNewRideRequest = (ride) => {
    Alert.alert(
      '🚕 新しい配車リクエスト',
      `距離: ${ride.distance}km\n予想料金: ¥${ride.estimatedFare}\n天候倍率: ${ride.weatherMultiplier}x`,
      [
        { text: '拒否', style: 'cancel' },
        { text: '承諾', onPress: () => acceptRide(ride) },
      ]
    );
  };

  const acceptRide = async (ride) => {
    setCurrentRide(ride);
    socket.current.emit('acceptRide', { rideId: ride.id, driverId: 'driver123' });
    
    // Navigate to pickup
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: ride.pickup.latitude,
        longitude: ride.pickup.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      socket.current.emit('driverOnline', {
        driverId: 'driver123',
        location,
      });
    } else {
      socket.current.emit('driverOffline', { driverId: 'driver123' });
    }
  };

  const renderRevenueCard = () => (
    <View style={styles.revenueCard}>
      <Text style={styles.cardTitle}>📊 AI収益予測</Text>
      {predictedEarnings ? (
        <>
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>次の1時間:</Text>
            <Text style={styles.predictionValue}>¥{predictedEarnings.nextHour}</Text>
          </View>
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>今日の予測:</Text>
            <Text style={styles.predictionValue}>¥{predictedEarnings.today}</Text>
          </View>
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>最適エリア:</Text>
            <Text style={styles.predictionValue}>{predictedEarnings.bestArea}</Text>
          </View>
          <View style={styles.surgeIndicator}>
            <Text style={styles.surgeText}>
              サージ倍率: {predictedEarnings.surgeMultiplier}x
            </Text>
          </View>
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );

  const renderWeatherCard = () => (
    <View style={styles.weatherCard}>
      <Text style={styles.cardTitle}>🌤️ 天候影響分析</Text>
      {weatherData ? (
        <>
          <Text style={styles.weatherText}>
            {weatherData.condition} {weatherData.temp}°C
          </Text>
          <Text style={styles.weatherImpact}>
            需要影響: {weatherData.demandImpact > 0 ? '+' : ''}{weatherData.demandImpact}%
          </Text>
          {weatherData.rainProbability > 60 && (
            <Text style={styles.weatherAlert}>
              ⚠️ 雨予報 - 需要増加見込み
            </Text>
          )}
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );

  const renderAISuggestions = () => (
    <View style={styles.suggestionsCard}>
      <Text style={styles.cardTitle}>🤖 AI推奨アクション</Text>
      {aiSuggestions.map((suggestion, index) => (
        <View key={index} style={styles.suggestionItem}>
          <Text style={styles.suggestionText}>{suggestion.message}</Text>
          <Text style={styles.suggestionTime}>{suggestion.time}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsTraffic={true}
          showsUserLocation={true}
        >
          {/* Driver location */}
          <Marker coordinate={location}>
            <Animated.View style={[styles.driverMarker, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.markerText}>🚕</Text>
            </Animated.View>
          </Marker>

          {/* Demand heatmap */}
          {demandHeatmap.length > 0 && (
            <Heatmap
              points={demandHeatmap}
              opacity={0.7}
              radius={50}
              gradient={{
                colors: ['green', 'yellow', 'orange', 'red'],
                startPoints: [0.1, 0.3, 0.6, 0.9],
              }}
            />
          )}

          {/* Surge areas */}
          {surgeAreas.map((area, index) => (
            <Circle
              key={index}
              center={area.center}
              radius={area.radius}
              fillColor="rgba(255, 0, 0, 0.2)"
              strokeColor="rgba(255, 0, 0, 0.5)"
              strokeWidth={2}
            />
          ))}

          {/* Current ride route */}
          {currentRide && (
            <>
              <Marker coordinate={currentRide.pickup}>
                <Text style={styles.markerText}>📍</Text>
              </Marker>
              <Marker coordinate={currentRide.dropoff}>
                <Text style={styles.markerText}>🏁</Text>
              </Marker>
              <Polyline
                coordinates={[currentRide.pickup, currentRide.dropoff]}
                strokeColor="#4A90E2"
                strokeWidth={3}
              />
            </>
          )}
        </MapView>
      )}

      <ScrollView style={styles.bottomPanel} showsVerticalScrollIndicator={false}>
        {/* Online toggle */}
        <View style={styles.onlineToggle}>
          <Text style={styles.toggleLabel}>営業状態</Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isOnline ? '#4A90E2' : '#f4f3f4'}
          />
          <Text style={[styles.statusText, isOnline ? styles.online : styles.offline]}>
            {isOnline ? 'オンライン' : 'オフライン'}
          </Text>
        </View>

        {/* AI Cards */}
        {renderRevenueCard()}
        {renderWeatherCard()}
        {renderAISuggestions()}

        {/* Earnings summary */}
        <View style={styles.earningsCard}>
          <Text style={styles.cardTitle}>💰 本日の収益</Text>
          <Text style={styles.earningsAmount}>¥{earnings.today.toLocaleString()}</Text>
          <View style={styles.earningsDetails}>
            <Text style={styles.earningsLabel}>配車数: 12</Text>
            <Text style={styles.earningsLabel}>平均単価: ¥2,450</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.4,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  online: {
    color: '#4CAF50',
  },
  offline: {
    color: '#999',
  },
  revenueCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  weatherCard: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  suggestionsCard: {
    backgroundColor: '#F3E5F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  earningsCard: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  predictionLabel: {
    fontSize: 14,
    color: '#666',
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  surgeIndicator: {
    backgroundColor: '#FF5252',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  surgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  weatherText: {
    fontSize: 16,
    marginBottom: 5,
  },
  weatherImpact: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  weatherAlert: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 10,
    fontWeight: '600',
  },
  suggestionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  suggestionTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 10,
  },
  earningsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#666',
  },
  driverMarker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    fontSize: 30,
  },
});