import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import allStationsData from '../data/all_japan_stations.json';
import TrainService from '../services/TrainService';

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const WEATHER_API_KEY = 'bd17578f85cb46d681ca3e4f3bdc9963';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATION_DATA = allStationsData;

export default function CustomerScreen({ onModeChange, onBack, pushToken }) {
  const [isIPad] = useState(Platform.isPad);
  const [location, setLocation] = useState(null);
  const [pickupStation, setPickupStation] = useState(null);
  const [homeAddress, setHomeAddress] = useState(null);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [fare, setFare] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [customAddress, setCustomAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [surgePricing, setSurgePricing] = useState(1.0);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [filteredStations, setFilteredStations] = useState(STATION_DATA.slice(0, 50));
  const [nearbyStations, setNearbyStations] = useState([]);
  const [stationWeather, setStationWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Train integration states
  const [trainDelays, setTrainDelays] = useState(null);
  const [nextTrains, setNextTrains] = useState([]);
  const [delaySubscription, setDelaySubscription] = useState(null);
  const [autoBookingTriggered, setAutoBookingTriggered] = useState(false);
  const [autoBookingEnabled, setAutoBookingEnabled] = useState(true);
  const [checkingTrains, setCheckingTrains] = useState(false);

  useEffect(() => {
    checkBackendConnection();
    initializeLocation();
    loadSavedAddresses();
    loadNearbyDrivers();
  }, []);

  useEffect(() => {
    if (location) {
      loadNearbyStations();
    }
  }, [location]);

  useEffect(() => {
    if (pickupStation) {
      checkStationWeather(pickupStation);
      checkTrainDelays(pickupStation);
      loadNextTrains(pickupStation);
      subscribeToDelayUpdates(pickupStation);
    }

    return () => {
      if (delaySubscription) {
        TrainService.unsubscribeFromDelays(delaySubscription);
      }
    };
  }, [pickupStation]);

  useEffect(() => {
    if (pickupStation && homeAddress) {
      calculateFare();
    }
  }, [pickupStation, homeAddress, surgePricing]);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      const data = await response.json();
      setBackendConnected(data.status === 'healthy');
    } catch (error) {
      console.log('Backend offline, using mock data');
      setBackendConnected(false);
    }
  };

  const initializeLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報へのアクセスが必要です');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  const loadNearbyStations = () => {
    if (!location) return;

    const nearby = STATION_DATA
      .map(station => ({
        ...station,
        distance: Math.sqrt(
          Math.pow(station.lat - location.latitude, 2) +
          Math.pow(station.lng - location.longitude, 2)
        ) * 111000
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    setNearbyStations(nearby);
  };

  const searchStations = (query) => {
    setStationSearchQuery(query);
    if (query.length === 0) {
      setFilteredStations(nearbyStations.length > 0 ? nearbyStations : STATION_DATA.slice(0, 50));
    } else {
      const filtered = STATION_DATA
        .filter(station =>
          station.name?.includes(query) ||
          station.nameEn?.toLowerCase().includes(query.toLowerCase()) ||
          station.prefecture?.includes(query) ||
          station.lines?.some(line => line.includes(query))
        )
        .slice(0, 100);
      setFilteredStations(filtered);
    }
  };

  // Train delay checking functions
  const checkTrainDelays = async (station) => {
    setCheckingTrains(true);
    try {
      const lines = await TrainService.getStationLines(station.name);
      const delayStatus = await TrainService.checkDelays(station.name, lines.map(l => l.id));

      setTrainDelays(delayStatus);

      // Auto-booking logic for severe delays
      if (delayStatus.hasDelays && delayStatus.maxDelay >= 30 && !autoBookingTriggered && autoBookingEnabled) {
        handleAutoBooking(delayStatus);
      }
    } catch (error) {
      console.error('Error checking train delays:', error);
    } finally {
      setCheckingTrains(false);
    }
  };

  const loadNextTrains = async (station) => {
    try {
      const trains = await TrainService.getNextTrains(station.name);
      setNextTrains(trains);
    } catch (error) {
      console.error('Error loading next trains:', error);
    }
  };

  const subscribeToDelayUpdates = async (station) => {
    const subscriptionId = await TrainService.subscribeToDelays(
      station.name,
      (delayStatus) => {
        setTrainDelays(delayStatus);

        if (delayStatus.maxDelay >= 20 && autoBookingEnabled) {
          Alert.alert(
            '⚠️ 電車遅延検知',
            `${station.name}で${delayStatus.maxDelay}分の遅延が発生しています。タクシーをご利用しますか？`,
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: 'タクシーを予約', onPress: () => handleAutoBooking(delayStatus) }
            ]
          );
        }
      }
    );

    setDelaySubscription(subscriptionId);
  };

  const handleAutoBooking = async (delayStatus) => {
    setAutoBookingTriggered(true);

    // Auto-fill destination if saved addresses exist
    if (savedAddresses.length > 0 && !homeAddress) {
      setHomeAddress(savedAddresses[0]);
    }

    // Increase surge pricing for delays
    if (delayStatus.maxDelay >= 30) {
      setSurgePricing(1.3);
    }

    Alert.alert(
      '🚕 自動配車提案',
      `${delayStatus.maxDelay}分の遅延を検知しました。\nタクシーを自動手配しますか？`,
      [
        { text: '後で', style: 'cancel' },
        {
          text: '今すぐ予約',
          onPress: () => {
            if (pickupStation && homeAddress) {
              requestRide();
            } else {
              Alert.alert('情報不足', '目的地を入力してください');
              setShowAddressModal(true);
            }
          }
        }
      ]
    );
  };

  const checkStationWeather = async (station) => {
    setLoadingWeather(true);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${station.lat}&lon=${station.lng}&appid=${WEATHER_API_KEY}&units=metric&lang=ja`
      );

      if (!response.ok) {
        console.error('Weather API error:', response.status);
        return;
      }

      const data = await response.json();
      const forecasts = data.list.slice(0, 3);
      const willRain = forecasts.some(f =>
        f.weather[0].main === 'Rain' ||
        f.weather[0].main === 'Drizzle' ||
        f.weather[0].main === 'Thunderstorm'
      );

      const rainForecast = forecasts.find(f =>
        f.weather[0].main === 'Rain' ||
        f.weather[0].main === 'Drizzle' ||
        f.weather[0].main === 'Thunderstorm'
      );

      const weatherInfo = {
        current: data.list[0].weather[0].description,
        temp: Math.round(data.list[0].main.temp),
        willRain,
        rainTime: rainForecast ? new Date(rainForecast.dt * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null,
        rainProbability: rainForecast ? Math.round((rainForecast.pop || 0) * 100) : 0
      };

      setStationWeather(weatherInfo);

      if (willRain) {
        setSurgePricing(1.15);
        if (weatherInfo.rainProbability > 80) {
          setSurgePricing(1.30);
        }
      } else if (!trainDelays?.hasDelays) {
        setSurgePricing(1.0);
      }

    } catch (error) {
      console.error('Weather check failed:', error);
    } finally {
      setLoadingWeather(false);
    }
  };

  const loadSavedAddresses = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedAddresses');
      if (saved) {
        const addresses = JSON.parse(saved);
        const sorted = addresses.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
        setSavedAddresses(sorted);
      }
    } catch (error) {
      console.log('Error loading saved addresses:', error);
    }
  };

  const saveAddress = async (address) => {
    try {
      const existingIndex = savedAddresses.findIndex(a => a.address === address);
      let updated = [...savedAddresses];

      if (existingIndex >= 0) {
        updated[existingIndex].useCount = (updated[existingIndex].useCount || 0) + 1;
        updated[existingIndex].lastUsed = new Date().toISOString();
      } else {
        updated.push({
          id: Date.now().toString(),
          address: address,
          name: address,
          useCount: 1,
          lastUsed: new Date().toISOString()
        });
      }

      updated.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
      setSavedAddresses(updated);
      await AsyncStorage.setItem('savedAddresses', JSON.stringify(updated));
    } catch (error) {
      console.log('Error saving address:', error);
    }
  };

  const loadNearbyDrivers = async () => {
    const baseDrivers = [
      {
        id: 'd1',
        name: '田中運転手',
        rating: 4.8,
        distance: 300,
        eta: 2,
        vehicle: 'トヨタ クラウン',
        plateNumber: '品川 500 た 12-34'
      },
      {
        id: 'd2',
        name: '佐藤運転手',
        rating: 4.9,
        distance: 500,
        eta: 3,
        vehicle: 'ニッサン フーガ',
        plateNumber: '品川 500 さ 56-78'
      },
      {
        id: 'd3',
        name: '鈴木運転手',
        rating: 4.7,
        distance: 800,
        eta: 5,
        vehicle: 'トヨタ プリウス',
        plateNumber: '品川 500 す 90-12'
      }
    ];
    setNearbyDrivers(baseDrivers);
  };

  const calculateFare = () => {
    if (!pickupStation || !homeAddress) return;

    const baseFare = 500; // Tokyo taxi initial fare
    let estimatedDistance = 5; // Default 5km

    // Special handling for known destinations
    const addressStr = homeAddress.address || homeAddress.name || '';

    // Airport destinations - fixed high distances
    if (addressStr.includes('羽田空港') || addressStr.includes('成田空港')) {
      if (addressStr.includes('羽田')) {
        // Distance from central Tokyo to Haneda
        estimatedDistance = 20 + Math.random() * 5; // 20-25km
      } else if (addressStr.includes('成田')) {
        // Distance from central Tokyo to Narita
        estimatedDistance = 60 + Math.random() * 10; // 60-70km
      }
    }
    // Station to station estimates
    else if (pickupStation && addressStr) {
      // Check prefecture difference
      if (pickupStation.prefecture === '東京都') {
        if (addressStr.includes('神奈川') || addressStr.includes('横浜')) {
          estimatedDistance = 30 + Math.random() * 10; // 30-40km
        } else if (addressStr.includes('千葉') || addressStr.includes('埼玉')) {
          estimatedDistance = 25 + Math.random() * 10; // 25-35km
        } else if (addressStr.includes('区')) {
          // Within Tokyo wards
          const sameWard = addressStr.includes('文京区') && pickupStation.name.includes('本郷');
          estimatedDistance = sameWard ?
            (1 + Math.random() * 2) : // 1-3km same ward
            (3 + Math.random() * 7);  // 3-10km different ward
        } else {
          // Default Tokyo distance
          estimatedDistance = 5 + Math.random() * 5; // 5-10km
        }
      } else {
        // Outside Tokyo
        estimatedDistance = 15 + Math.random() * 15; // 15-30km
      }
    }

    // Tokyo taxi fare calculation
    let totalFare = baseFare;

    if (estimatedDistance > 1.096) {
      const additionalDistance = estimatedDistance - 1.096;
      const additionalUnits = Math.ceil(additionalDistance / 0.255);
      totalFare += additionalUnits * 100;
    }

    // Time-based fare (traffic)
    const estimatedMinutes = estimatedDistance * 3; // 3 min per km average
    const timeFare = Math.floor(estimatedMinutes / 1.5) * 40;
    totalFare += timeFare;

    // Late night surcharge
    const currentHour = new Date().getHours();
    if (currentHour >= 22 || currentHour < 5) {
      totalFare *= 1.2;
    }

    // Apply surge pricing
    if (surgePricing > 1.0) {
      totalFare = Math.floor(totalFare * surgePricing);
    }

    // Round to nearest 10 yen
    totalFare = Math.round(totalFare / 10) * 10;

    // Minimum fare
    totalFare = Math.max(totalFare, 500);

    setFare(totalFare);
    setEstimatedTime(Math.floor(estimatedMinutes));
  };

  const requestRide = async () => {
    if (!pickupStation || !homeAddress) {
      Alert.alert('エラー', '乗車駅と目的地を選択してください');
      return;
    }

    setBookingStatus('requesting');

    setTimeout(() => {
      setBookingStatus('confirmed');
      const mockConfirmation = 'ZK' + Math.random().toString(36).substr(2, 9).toUpperCase();
      setConfirmationNumber(mockConfirmation);
      setSelectedDriver(nearbyDrivers[0]);

      Alert.alert(
        '予約確定',
        `確認番号: ${mockConfirmation}\n${nearbyDrivers[0].name}が${nearbyDrivers[0].eta}分で到着します`
      );
    }, 1500);
  };

  const cancelBooking = async () => {
    Alert.alert(
      'キャンセル確認',
      '本当にキャンセルしますか？',
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: 'はい',
          onPress: () => {
            setBookingStatus('idle');
            setSelectedDriver(null);
            setFare(null);
            setEstimatedTime(null);
            setConfirmationNumber('');
            setAutoBookingTriggered(false);
          }
        }
      ]
    );
  };

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapContent}>
        <View style={styles.mapHeader}>
          <Ionicons name="map" size={30} color="#FFD700" />
          <Text style={styles.mapTitle}>
            {pickupStation ? pickupStation.name : '全国対応マップ'}
          </Text>
        </View>

        {pickupStation && (
          <View style={styles.stationInfo}>
            <Text style={styles.stationInfoText}>
              📍 {pickupStation.prefecture} • {pickupStation.lines?.[0] || ''}
            </Text>
          </View>
        )}

        <View style={styles.driversList}>
          {nearbyDrivers.map((driver) => (
            <View key={driver.id} style={styles.driverItem}>
              <Text style={styles.driverEmoji}>🚕</Text>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverInfo}>
                  {driver.distance}m • {driver.eta}分 • ★{driver.rating}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {stationWeather && (
        <View style={styles.weatherBadge}>
          <Text style={styles.weatherText}>
            {stationWeather.willRain ? '☔' : '☀️'} {stationWeather.temp}°C
          </Text>
        </View>
      )}

      {trainDelays?.hasDelays && (
        <View style={styles.delayBadge}>
          <Text style={styles.delayBadgeText}>
            ⚠️ {trainDelays.maxDelay}分遅延
          </Text>
        </View>
      )}
    </View>
  );

  const renderTrainStatus = () => {
    if (!pickupStation) return null;

    return (
      <View style={styles.trainStatusCard}>
        <View style={styles.trainStatusHeader}>
          {checkingTrains ? (
            <ActivityIndicator size="small" color="#FFD700" />
          ) : (
            <Ionicons
              name={trainDelays?.hasDelays ? "warning" : "checkmark-circle"}
              size={24}
              color={trainDelays?.hasDelays ? "#FF6347" : "#4CAF50"}
            />
          )}
          <Text style={styles.trainStatusTitle}>
            {checkingTrains ? '確認中...' :
             trainDelays?.hasDelays ? '遅延情報' : '正常運行'}
          </Text>
          <TouchableOpacity
            onPress={() => checkTrainDelays(pickupStation)}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {trainDelays?.hasDelays && (
          <View style={styles.delayDetails}>
            {trainDelays.delays.map((delay, index) => (
              <View key={index} style={styles.delayItem}>
                <Text style={styles.delayLine}>{delay.lineName}</Text>
                <Text style={styles.delayTime}>{delay.delayMinutes}分遅延</Text>
                {delay.description && !delay.description.includes('odpt') && (
                  <Text style={styles.delayReason}>{delay.description}</Text>
                )}
              </View>
            ))}

            {trainDelays.recommendation && (
              <View style={[
                styles.recommendationBox,
                trainDelays.recommendation.type === 'urgent' && styles.urgentBox
              ]}>
                <Text style={styles.recommendationText}>
                  {trainDelays.recommendation.message}
                </Text>
              </View>
            )}
          </View>
        )}

        {nextTrains.length > 0 && (
          <View style={styles.nextTrainsSection}>
            <Text style={styles.nextTrainsTitle}>次の電車</Text>
            {nextTrains.slice(0, 3).map((train, index) => (
              <View key={index} style={styles.nextTrainItem}>
                <Text style={styles.trainTime}>{train.departureTime}</Text>
                <Text style={styles.trainDestination}>{train.destination}行き</Text>
                <Text style={styles.trainType}>{train.trainType}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onBack && onBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>全国AIタクシー</Text>
        <View style={styles.connectionStatus}>
          <View style={[styles.connectionDot, backendConnected ? styles.online : styles.offline]} />
          <Text style={styles.connectionText}>
            {backendConnected ? 'オンライン' : 'オフライン'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {renderMapView()}

        <View style={styles.mainCard}>
          <Text style={styles.sectionTitle}>配車リクエスト</Text>

          <TouchableOpacity
            style={styles.inputButton}
            onPress={() => {
              setShowStationModal(true);
              setFilteredStations(nearbyStations.length > 0 ? nearbyStations : STATION_DATA.slice(0, 50));
            }}
          >
            <Ionicons name="train" size={24} color="#FFD700" />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.inputButtonText}>
                {pickupStation ? pickupStation.name : '乗車駅を選択'}
              </Text>
              {pickupStation && (
                <Text style={styles.inputButtonSubtext}>
                  {pickupStation.prefecture} • {pickupStation.lines?.[0] || ''}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {renderTrainStatus()}

          <TouchableOpacity
            style={styles.inputButton}
            onPress={() => setShowAddressModal(true)}
          >
            <Ionicons name="location" size={24} color="#FF6347" />
            <Text style={styles.inputButtonText}>
              {homeAddress ? (homeAddress.name || homeAddress.address) : '目的地を入力'}
            </Text>
          </TouchableOpacity>

          {stationWeather && pickupStation && (
            <View style={[styles.weatherCard, stationWeather.willRain && styles.weatherCardRain]}>
              <Ionicons
                name={stationWeather.willRain ? "rainy" : "partly-sunny"}
                size={24}
                color={stationWeather.willRain ? "#4A90E2" : "#FFD700"}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.weatherTitle}>
                  {pickupStation.name}の天気
                </Text>
                <Text style={styles.weatherDescription}>
                  {stationWeather.current} • {stationWeather.temp}°C
                </Text>
                {stationWeather.willRain && (
                  <Text style={styles.weatherWarning}>
                    ⚠️ {stationWeather.rainTime}頃に雨予報（{stationWeather.rainProbability}%）
                  </Text>
                )}
              </View>
            </View>
          )}

          {fare && (
            <View style={styles.fareContainer}>
              <Text style={styles.fareLabel}>予想料金</Text>
              <Text style={styles.fareAmount}>¥{fare.toLocaleString()}</Text>
              {surgePricing > 1.0 && (
                <Text style={styles.surgeText}>
                  ※ {trainDelays?.hasDelays ? '遅延' : '雨天'}のため{Math.floor((surgePricing - 1) * 100)}%増
                </Text>
              )}
              <Text style={styles.savingsText}>
                GOより¥1,380お得！
              </Text>
              {estimatedTime && (
                <Text style={styles.estimatedTimeText}>
                  予想時間: 約{estimatedTime}分
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.requestButton,
              (!pickupStation || !homeAddress) && styles.requestButtonDisabled
            ]}
            onPress={requestRide}
            disabled={!pickupStation || !homeAddress || bookingStatus !== 'idle'}
          >
            <Text style={styles.requestButtonText}>
              {bookingStatus === 'requesting' ? '予約中...' :
               bookingStatus === 'confirmed' ? `確認番号: ${confirmationNumber}` :
               '配車をリクエスト'}
            </Text>
          </TouchableOpacity>

          {bookingStatus === 'confirmed' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelBooking}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.trainCard}>
          <View style={styles.trainCardHeader}>
            <Ionicons name="train" size={24} color="#FFD700" />
            <Text style={styles.trainCardTitle}>電車遅延自動検知</Text>
            <TouchableOpacity
              style={[styles.syncToggle, autoBookingEnabled && styles.syncToggleActive]}
              onPress={() => setAutoBookingEnabled(!autoBookingEnabled)}
            >
              <Text style={styles.syncToggleText}>
                {autoBookingEnabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.trainCardDescription}>
            30分以上の遅延を検知すると自動的にタクシーを提案します
          </Text>
        </View>

        <TouchableOpacity
          style={styles.modeSwitchButton}
          onPress={() => onModeChange && onModeChange('driver')}
        >
          <Ionicons name="car" size={24} color="white" />
          <Text style={styles.modeSwitchButtonText}>ドライバーモードに切り替え</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Station Selection Modal */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>駅を選択（全国対応）</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowStationModal(false);
                  setStationSearchQuery('');
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="駅名・都道府県・路線名で検索"
                value={stationSearchQuery}
                onChangeText={searchStations}
              />
            </View>

            {nearbyStations.length > 0 && stationSearchQuery === '' && (
              <View style={styles.nearbySection}>
                <Text style={styles.nearbySectionTitle}>📍 近くの駅</Text>
              </View>
            )}

            <FlatList
              data={filteredStations}
              keyExtractor={(item) => item.id.toString()}
              style={styles.stationList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stationItem}
                  onPress={() => {
                    setPickupStation(item);
                    setShowStationModal(false);
                    setStationSearchQuery('');
                    setAutoBookingTriggered(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stationName}>{item.name}</Text>
                    <Text style={styles.stationDetails}>
                      {item.prefecture} • {item.lines?.join(', ') || ''}
                    </Text>
                  </View>
                  {item.distance && (
                    <Text style={styles.stationDistance}>
                      {item.distance < 1000 ? `${Math.round(item.distance)}m` : `${(item.distance / 1000).toFixed(1)}km`}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Address Input Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={false}
        presentationStyle="formSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>目的地を入力</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddressModal(false);
                  setCustomAddress('');
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#FFD700',
                borderRadius: 10,
                padding: 15,
                fontSize: 16,
                marginBottom: 15,
              }}
              placeholder="住所を入力してください（例：渋谷区道玄坂1-2-3）"
              value={customAddress}
              onChangeText={setCustomAddress}
              autoFocus={false}
            />

            <TouchableOpacity
              style={{
                backgroundColor: customAddress.trim() ? '#FFD700' : '#ccc',
                padding: 15,
                borderRadius: 10,
                alignItems: 'center',
                marginBottom: 20,
              }}
              onPress={() => {
                if (customAddress.trim()) {
                  const newAddress = {
                    address: customAddress.trim(),
                    name: customAddress.trim()
                  };
                  setHomeAddress(newAddress);
                  saveAddress(customAddress.trim());
                  setShowAddressModal(false);
                  setCustomAddress('');
                }
              }}
              disabled={!customAddress.trim()}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                この住所を使用
              </Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 400 }}>
              {savedAddresses.length > 0 && (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                    よく使う目的地
                  </Text>
                  {savedAddresses.map((addr, index) => (
                    <TouchableOpacity
                      key={addr.id || index}
                      style={{
                        padding: 15,
                        backgroundColor: '#f8f8f8',
                        borderRadius: 10,
                        marginBottom: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setHomeAddress(addr);
                        saveAddress(addr.address);
                        setShowAddressModal(false);
                        setCustomAddress('');
                      }}
                    >
                      <Ionicons
                        name={index < 3 ? "star" : "location"}
                        size={20}
                        color={index < 3 ? "#FFD700" : "#666"}
                      />
                      <Text style={{ marginLeft: 10, flex: 1 }}>
                        {addr.name || addr.address}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#999' }}>
                        {addr.useCount}回
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FFD700',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#f44336',
  },
  connectionText: {
    fontSize: 12,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  mapContainer: {
    height: 250,
    backgroundColor: '#e8f4f8',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  mapContent: {
    flex: 1,
    padding: 15,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  stationInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  stationInfoText: {
    fontSize: 14,
    color: '#666',
  },
  driversList: {
    flex: 1,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  driverEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  driverInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  weatherBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  weatherText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  delayBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 99, 71, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  delayBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  mainCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputButtonText: {
    fontSize: 16,
    color: '#333',
  },
  inputButtonSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trainStatusCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  trainStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  trainStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
    color: '#333',
  },
  refreshButton: {
    padding: 5,
  },
  delayDetails: {
    marginTop: 10,
  },
  delayItem: {
    backgroundColor: '#fff5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  delayLine: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6347',
  },
  delayTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  delayReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  recommendationBox: {
    backgroundColor: '#FFF8DC',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  urgentBox: {
    backgroundColor: '#FFE4E1',
    borderWidth: 1,
    borderColor: '#FF6347',
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  nextTrainsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nextTrainsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  nextTrainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  trainTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 50,
  },
  trainDestination: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  trainType: {
    fontSize: 12,
    color: '#999',
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  weatherCardRain: {
    backgroundColor: '#fff0f0',
  },
  weatherTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  weatherDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  weatherWarning: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 4,
    fontWeight: 'bold',
  },
  fareContainer: {
    backgroundColor: '#FFF8DC',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  fareAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  surgeText: {
    fontSize: 12,
    color: '#FF6347',
    marginTop: 5,
  },
  savingsText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 5,
    fontWeight: 'bold',
  },
  estimatedTimeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  requestButton: {
    backgroundColor: '#FFD700',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  requestButtonDisabled: {
    backgroundColor: '#ccc',
  },
  requestButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trainCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  trainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  trainCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  syncToggle: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  syncToggleActive: {
    backgroundColor: '#4CAF50',
  },
  syncToggleText: {
    color: 'white',
    fontWeight: 'bold',
  },
  trainCardDescription: {
    fontSize: 14,
    color: '#666',
  },
  modeSwitchButton: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  modeSwitchButtonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  nearbySection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff8dc',
  },
  nearbySectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  stationList: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  stationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stationDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  stationDistance: {
    fontSize: 14,
    color: '#999',
  },
});
