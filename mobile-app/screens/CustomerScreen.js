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
  SafeAreaView
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import allStationsData from '../data/all_japan_stations.json';

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const WEATHER_API_KEY = 'bd17578f85cb46d681ca3e4f3bdc9963';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATION_DATA = allStationsData;

export default function CustomerScreen({ onModeChange, onBack }) {
  // Keep all your existing state variables
  const [isIPad] = useState(Platform.isPad);
  const [location, setLocation] = useState(null);
  const [pickupStation, setPickupStation] = useState(null);
  const [homeAddress, setHomeAddress] = useState(null);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [autoBookingEnabled, setAutoBookingEnabled] = useState(false);
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

  // Keep all your existing useEffect hooks and functions exactly as they are
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
    }
  }, [pickupStation]);

  useEffect(() => {
    if (pickupStation && homeAddress) {
      calculateFare();
    }
  }, [pickupStation, homeAddress]);

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

        Alert.alert(
          '☔ 雨の予報',
          `${station.name}周辺で${weatherInfo.rainTime}頃に雨（${weatherInfo.rainProbability}%）\nタクシーのご利用をお勧めします`,
          [{ text: 'OK' }]
        );
      } else {
        setSurgePricing(1.0);
      }

    } catch (error) {
      console.error('Weather check failed:', error);
      setStationWeather({
        current: '天気情報取得エラー',
        temp: '--',
        willRain: false
      });
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

    const baseFare = 730;
    let estimatedDistance = 10;

    if (location && pickupStation.lat && pickupStation.lng) {
      const R = 6371;
      const dLat = (location.latitude - pickupStation.lat) * Math.PI / 180;
      const dLng = (location.longitude - pickupStation.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(pickupStation.lat * Math.PI / 180) *
                Math.cos(location.latitude * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      estimatedDistance = R * c * 1.3;
    } else {
      if (pickupStation.prefecture === '東京都') {
        estimatedDistance = 8;
      } else if (pickupStation.prefecture === '大阪府') {
        estimatedDistance = 12;
      } else if (pickupStation.prefecture === '北海道') {
        estimatedDistance = 15;
      } else {
        estimatedDistance = 10;
      }
    }

    estimatedDistance = estimatedDistance * (1 + (Math.random() - 0.5) * 0.4);

    let distanceFare = 0;
    if (estimatedDistance > 1.096) {
      const additionalDistance = estimatedDistance - 1.096;
      distanceFare = Math.floor(additionalDistance / 0.255) * 90;
    }

    const estimatedMinutes = (estimatedDistance / 25) * 60;
    const timeFare = Math.floor(estimatedMinutes * 40);

    let totalFare = baseFare + distanceFare + timeFare;

    if (estimatedDistance > 15) {
      totalFare += 500;
    }

    if (surgePricing > 1.0) {
      totalFare = Math.floor(totalFare * surgePricing);
    }

    totalFare = Math.round(totalFare / 10) * 10;

    setFare(totalFare);
    setEstimatedTime(Math.floor(estimatedMinutes));
  };

  const validateAddress = (address) => {
    if (!address || address.trim().length < 3) {
      return { isValid: false, error: '住所が短すぎます（3文字以上）' };
    }

    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(address);
    const hasNumbers = /\d/.test(address);

    if (!hasJapanese && !hasNumbers) {
      return { isValid: false, error: '有効な住所を入力してください' };
    }

    const commonPatterns = ['都', '県', '市', '区', '町', '丁目', '番', '号'];
    const hasAddressPattern = commonPatterns.some(pattern => address.includes(pattern));

    if (!hasAddressPattern && address.length < 10) {
      return { isValid: false, error: '完全な住所を入力してください（例：渋谷区道玄坂1-2-3）' };
    }

    return { isValid: true };
  };

  const requestRide = async () => {
    if (!pickupStation || !homeAddress) {
      Alert.alert('エラー', '乗車駅と目的地を選択してください');
      return;
    }

    setBookingStatus('requesting');

    setTimeout(() => {
      setBookingStatus('confirmed');
      setSelectedDriver(nearbyDrivers[0]);
      const mockConfirmation = 'ZK' + Math.random().toString(36).substr(2, 9).toUpperCase();
      setConfirmationNumber(mockConfirmation);
      Alert.alert('予約確定', `確認番号: ${mockConfirmation}`);
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
          }
        }
      ]
    );
  };

  // Simple map visualization without any external dependencies
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

        {!pickupStation && (
          <Text style={styles.mapHint}>
            駅を選択すると、利用可能なドライバーが表示されます
          </Text>
        )}
      </View>

      {stationWeather && (
        <View style={styles.weatherBadge}>
          <Text style={styles.weatherText}>
            {stationWeather.willRain ? '☔' : '☀️'} {stationWeather.temp}°C
          </Text>
        </View>
      )}

      <View style={styles.mapOverlay}>
        <Text style={styles.mapOverlayText}>
          {nearbyDrivers.length}台の利用可能なドライバー
        </Text>
      </View>
    </View>
  );

  const AddressInputModal = () => {
    const [localAddress, setLocalAddress] = useState('');
    const [addressError, setAddressError] = useState('');

    if (!showAddressModal) return null;

    const handleAddressSubmit = () => {
      const validation = validateAddress(localAddress);

      if (!validation.isValid) {
        setAddressError(validation.error);
        Alert.alert('入力エラー', validation.error);
        return;
      }

      const newAddress = {
        address: localAddress.trim(),
        name: localAddress.trim()
      };
      setHomeAddress(newAddress);
      saveAddress(localAddress.trim());

      if (pickupStation) {
        calculateFare();
      }

      setShowAddressModal(false);
      setLocalAddress('');
      setAddressError('');
      setCustomAddress('');
    };

    return (
      <Modal
        visible={true}
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
                  setLocalAddress('');
                  setCustomAddress('');
                  setAddressError('');
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: addressError ? '#ff6b6b' : '#FFD700',
                borderRadius: 10,
                padding: 15,
                fontSize: 16,
                marginBottom: 5,
              }}
              placeholder="住所を入力してください（例：渋谷区道玄坂1-2-3）"
              value={localAddress}
              onChangeText={(text) => {
                setLocalAddress(text);
                setAddressError('');
              }}
              autoFocus={false}
            />

            {addressError ? (
              <Text style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 10 }}>
                {addressError}
              </Text>
            ) : null}

            <TouchableOpacity
              style={{
                backgroundColor: localAddress.trim() ? '#FFD700' : '#ccc',
                padding: 15,
                borderRadius: 10,
                alignItems: 'center',
                marginBottom: 20,
              }}
              onPress={handleAddressSubmit}
              disabled={!localAddress.trim()}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                この住所を使用
              </Text>
            </TouchableOpacity>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>
                サンプル住所:
              </Text>
              <TouchableOpacity
                onPress={() => setLocalAddress('東京都渋谷区道玄坂1-2-3')}
                style={{ padding: 10, backgroundColor: '#f0f0f0', marginBottom: 5, borderRadius: 5 }}
              >
                <Text>東京都渋谷区道玄坂1-2-3</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLocalAddress('港区六本木6-10-1')}
                style={{ padding: 10, backgroundColor: '#f0f0f0', marginBottom: 5, borderRadius: 5 }}
              >
                <Text>港区六本木6-10-1</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {savedAddresses.length > 0 && (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                    保存された住所
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
                        if (pickupStation) {
                          calculateFare();
                        }
                        setShowAddressModal(false);
                        setLocalAddress('');
                        setCustomAddress('');
                        setAddressError('');
                      }}
                    >
                      <Ionicons name="location" size={20} color="#666" />
                      <Text style={{ marginLeft: 10, flex: 1 }}>
                        {addr.name || addr.address}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
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

        {/* Rest of your content remains exactly the same */}
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

          <TouchableOpacity
            style={styles.inputButton}
            onPress={() => {
              setShowAddressModal(true);
              setCustomAddress('');
            }}
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
                  ※ 雨天のため{Math.floor((surgePricing - 1) * 100)}%増
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

          {nearbyDrivers.length > 0 && (
            <View style={styles.driversContainer}>
              <Text style={styles.driversTitle}>利用可能なドライバー</Text>
              <Text style={styles.driversCount}>{nearbyDrivers.length}台</Text>
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
            <Text style={styles.trainCardTitle}>天気予報連携</Text>
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
            駅到着時の天気を予測して、雨の場合は自動的にタクシーを提案します
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

      {/* Station Selection Modal - keep exactly as is */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
                    if (homeAddress) calculateFare();
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

      <AddressInputModal />
    </View>
  );
}

// Keep all your existing styles and add these new ones
const styles = StyleSheet.create({
  // All your existing styles remain the same
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
  // New map styles without external dependencies
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
  mapHint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 20,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
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
  // Keep all your other existing styles
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
  driversContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  driversTitle: {
    fontSize: 14,
    color: '#666',
  },
  driversCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
