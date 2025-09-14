/******************************************
 * FILE: CustomerScreen.js
 * VERSION: Build 120 (Corrected Structure)
 * STATUS: 🔧 PROPERLY STRUCTURED
 *
 * FIXED ISSUES:
 * - Corrected import order and structure
 * - Fixed StyleSheet placement at end
 * - Complete component implementation
 * - All functions properly defined
 *
 * LAST UPDATED: December 21, 2024
 ******************************************/

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import * as Location from 'expo-location';

// Backend service URLs
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const JAGEOCODER_URL = 'https://tokyo-taxi-jageocoder-production.up.railway.app';

export default function CustomerScreen({ onModeChange, onBack, backendStatus, locationPermission }) {
  const [isIPad] = useState(Platform.isPad);
  const [location, setLocation] = useState(null);
  const [pickupStation, setPickupStation] = useState(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [showStationModal, setShowStationModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fare and booking states
  const [fare, setFare] = useState(null);
  const [distance, setDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [surgePricing, setSurgePricing] = useState(1.0);

  // Service status
  const [serviceStatus, setServiceStatus] = useState({
    backend: false,
    jageocoder: false,
    lastCheck: null
  });

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await getCurrentLocation();
    await loadStations();
    await checkServiceStatus();
    checkSurgePricing();
  };

  const getCurrentLocation = async () => {
    try {
      if (locationPermission) {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
        console.log('Got user location:', location.coords);
      } else {
        // Set your specific Aichi location instead of Tokyo
        const aichiLocation = { latitude: 35.2554861, longitude: 137.023075 };
        setLocation(aichiLocation);
        console.log('Using Aichi fallback location:', aichiLocation);
      }
    } catch (error) {
      console.log('Location error:', error);
      // Use your Aichi location as fallback instead of Tokyo
      const aichiLocation = { latitude: 35.2554861, longitude: 137.023075 };
      setLocation(aichiLocation);
      console.log('Location error, using Aichi fallback:', aichiLocation);
    }
  };

  const loadStations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/stations`, {
        timeout: 10000
      });

      if (response.ok) {
        const stationData = await response.json();
        if (stationData.stations && Array.isArray(stationData.stations)) {
          setStations(stationData.stations);
          setFilteredStations(stationData.stations.slice(0, 20));
        } else {
          throw new Error('Invalid station data format');
        }
      } else {
        throw new Error(`Station API failed: ${response.status}`);
      }
    } catch (error) {
      console.log('Station loading error:', error);
      const fallbackStations = [
        { id: 1, name: '名古屋駅', lat: 35.170694, lng: 136.881636, prefecture: '愛知県' },
        { id: 2, name: '栄駅', lat: 35.171196, lng: 136.908347, prefecture: '愛知県' },
        { id: 3, name: '金山駅', lat: 35.143284, lng: 136.902254, prefecture: '愛知県' },
        { id: 4, name: 'SL名古屋駅', lat: 35.170694, lng: 136.881636, prefecture: '愛知県' },
        { id: 5, name: '春日井駅', lat: 35.248089, lng: 136.972694, prefecture: '愛知県' }
      ];
      setStations(fallbackStations);
      setFilteredStations(fallbackStations);
    } finally {
      setIsLoading(false);
    }
  };

  const checkServiceStatus = async () => {
    const status = { ...serviceStatus, lastCheck: new Date().toLocaleTimeString() };

    try {
      const backendResponse = await fetch(`${BACKEND_URL}/api/health`, { timeout: 5000 });
      status.backend = backendResponse.ok;
    } catch (error) {
      status.backend = false;
    }

    try {
      const jageocoderResponse = await fetch(`${JAGEOCODER_URL}/health`, { timeout: 5000 });
      status.jageocoder = jageocoderResponse.ok;
    } catch (error) {
      status.jageocoder = false;
    }

    setServiceStatus(status);
  };

  const checkSurgePricing = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 7 && currentHour <= 9) {
      setSurgePricing(1.2); // Morning rush
    } else if (currentHour >= 17 && currentHour <= 19) {
      setSurgePricing(1.2); // Evening rush
    } else if (currentHour >= 22 || currentHour < 5) {
      setSurgePricing(1.3); // Late night
    } else {
      setSurgePricing(1.0); // Normal
    }
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const searchStations = (query) => {
    setStationSearchQuery(query);

    let filtered = stations;

    if (query.trim() !== '') {
      filtered = stations.filter(station =>
        station.name.includes(query) ||
        station.prefecture?.includes(query)
      );
    }

    if (location) {
      filtered = filtered.filter(station => {
        if (!station.lat || !station.lng) return true;
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          station.lat,
          station.lng
        );
        return distance <= 50;
      });

      filtered.sort((a, b) => {
        if (!a.lat || !a.lng || !b.lat || !b.lng) return 0;
        const distanceA = calculateDistance(location.latitude, location.longitude, a.lat, a.lng);
        const distanceB = calculateDistance(location.latitude, location.longitude, b.lat, b.lng);
        return distanceA - distanceB;
      });
    }

    setFilteredStations(filtered.slice(0, 20));
  };

  const selectStation = (station) => {
    setPickupStation(station);
    setShowStationModal(false);
    setStationSearchQuery('');

    if (destinationAddress) {
      calculateFareWithJAGeocoder(station, destinationAddress);
    }
  };

  const setDestination = (address) => {
    setDestinationAddress(address);
    setShowAddressModal(false);
    setCustomAddress('');

    if (pickupStation) {
      calculateFareWithJAGeocoder(pickupStation, address);
    }
  };

  const calculateFareWithJAGeocoder = async (station, address) => {
    if (!station || !address) return;

    setIsLoading(true);

    try {
      const geocodeResponse = await fetch(
        `${JAGEOCODER_URL}/geocode/${encodeURIComponent(address)}`,
        { timeout: 10000 }
      );

      if (!geocodeResponse.ok) {
        throw new Error(`Geocoding failed: ${geocodeResponse.status}`);
      }

      const geocodeData = await geocodeResponse.json();

      const distanceResponse = await fetch(
        `${JAGEOCODER_URL}/distance?from_lat=${station.lat}&from_lng=${station.lng}&to_lat=${geocodeData.latitude}&to_lng=${geocodeData.longitude}`,
        { timeout: 10000 }
      );

      if (!distanceResponse.ok) {
        throw new Error(`Distance calculation failed: ${distanceResponse.status}`);
      }

      const distanceData = await distanceResponse.json();

      const calculatedDistance = distanceData.distance_km;
      const calculatedTime = distanceData.duration_minutes;
      const calculatedFare = calculateStableFare(calculatedDistance);

      setDistance(calculatedDistance);
      setEstimatedTime(calculatedTime);
      setFare(calculatedFare);

    } catch (error) {
      console.log('JAGeocoder calculation error:', error);

      const estimatedDistance = estimateDistanceFromAddress(station, address);
      const estimatedTime = Math.ceil(estimatedDistance * 3.5);
      const fallbackFare = calculateStableFare(estimatedDistance);

      setDistance(estimatedDistance);
      setEstimatedTime(estimatedTime);
      setFare(fallbackFare);

      Alert.alert(
        '距離計算',
        'リアルタイム距離計算が利用できないため、推定値を使用しています。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStableFare = (distanceKm) => {
    const baseFare = 500;
    const baseDistance = 1.096;
    const meterRate = 100;

    let totalFare = baseFare;

    if (distanceKm > baseDistance) {
      const additionalKm = distanceKm - baseDistance;
      const units = Math.ceil(additionalKm / 0.237);
      totalFare += units * meterRate;
    }

    totalFare = Math.floor(totalFare * surgePricing);
    totalFare = Math.round(totalFare / 10) * 10;

    return Math.max(500, totalFare);
  };

  const estimateDistanceFromAddress = (station, address) => {
    const stationName = station.name;

    if (address.includes('羽田空港')) {
      if (stationName.includes('東京') || stationName.includes('品川')) return 15;
      if (stationName.includes('新宿') || stationName.includes('渋谷')) return 20;
      if (stationName.includes('名古屋')) return 350;
      return 18;
    }

    if (address.includes('成田空港')) return 65;

    if (address.includes('愛知県春日井市大留町')) {
      if (stationName.includes('名古屋') || stationName.includes('SL名古屋')) return 19.5;
      if (stationName.includes('栄')) return 16;
      if (stationName.includes('金山')) return 14;
      return 18;
    }

    return Math.max(3, Math.min(25, address.length * 0.4));
  };

  const bookTaxi = async () => {
    if (!pickupStation || !destinationAddress || !fare) {
      Alert.alert('エラー', '出発駅と目的地を選択してください。');
      return;
    }

    setIsLoading(true);

    try {
      const confNumber = Math.floor(1000 + Math.random() * 9000);
      setConfirmationNumber(confNumber.toString());

      if (serviceStatus.backend) {
        await fetch(`${BACKEND_URL}/api/bookings/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmationNumber: confNumber,
            pickup: {
              station: pickupStation.name,
              lat: pickupStation.lat,
              lng: pickupStation.lng
            },
            destination: destinationAddress,
            fare: fare,
            distance: distance,
            estimatedTime: estimatedTime,
            surge: surgePricing,
            timestamp: new Date().toISOString()
          })
        });
      }

      Alert.alert(
        'タクシーを確保しました',
        `確認番号: ${confNumber}\n` +
        `乗車駅: ${pickupStation.name}\n` +
        `目的地: ${destinationAddress}\n` +
        `料金: ¥${fare.toLocaleString()}\n` +
        `距離: ${distance}km\n` +
        `到着予定: ${estimatedTime}分後\n\n` +
        `ドライバーが確定次第、お知らせします。`,
        [
          {
            text: 'OK',
            onPress: () => {
              setPickupStation(null);
              setDestinationAddress('');
              setFare(null);
              setDistance(null);
              setEstimatedTime(null);
            }
          }
        ]
      );

    } catch (error) {
      console.log('Booking error:', error);
      Alert.alert(
        'エラー',
        '予約処理中にエラーが発生しました。もう一度お試しください。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderServiceStatus = () => (
    <View style={styles.serviceStatus}>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>接続状況</Text>
        <Text style={styles.statusTime}>{serviceStatus.lastCheck}</Text>
      </View>
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: serviceStatus.backend ? '#4CAF50' : '#f44336' }]} />
          <Text style={styles.statusText}>
            バックエンド: {serviceStatus.backend ? '✅' : '❌'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: serviceStatus.jageocoder ? '#4CAF50' : '#f44336' }]} />
          <Text style={styles.statusText}>
            JAGeocoder: {serviceStatus.jageocoder ? '✅' : '❌'}
          </Text>
        </View>
      </View>
      {stations.length > 0 && (
        <Text style={styles.stationCount}>駅データ: {stations.length.toLocaleString()} 件</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>タクシーを呼ぶ</Text>
        <TouchableOpacity onPress={onModeChange} style={styles.switchButton}>
          <Text style={styles.switchButtonText}>ドライバー</Text>
        </TouchableOpacity>
      </View>

      {renderServiceStatus()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>出発駅を選択</Text>
        <TouchableOpacity
          style={[styles.inputButton, isIPad && styles.inputButtonTablet]}
          onPress={() => setShowStationModal(true)}
        >
          <Text style={[styles.inputButtonText, isIPad && styles.inputButtonTextTablet]}>
            {pickupStation ? pickupStation.name : '駅名で検索...'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>目的地</Text>
        <TouchableOpacity
          style={[styles.inputButton, isIPad && styles.inputButtonTablet]}
          onPress={() => setShowAddressModal(true)}
        >
          <Text style={[styles.inputButtonText, isIPad && styles.inputButtonTextTablet]}>
            {destinationAddress || 'カスタム住所を入力...'}
          </Text>
        </TouchableOpacity>
      </View>

      {fare && distance && (
        <View style={styles.fareSection}>
          <View style={styles.fareHeader}>
            <Text style={styles.fareTitle}>料金確認</Text>
            {surgePricing > 1.0 && (
              <Text style={styles.surgeIndicator}>
                サージ x{surgePricing.toFixed(1)}
              </Text>
            )}
          </View>

          <View style={styles.fareDetails}>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>出発</Text>
              <Text style={styles.fareValue}>{pickupStation?.name}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>目的地</Text>
              <Text style={styles.fareValue}>{destinationAddress}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>距離</Text>
              <Text style={styles.fareValue}>{distance} km</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>予想時間</Text>
              <Text style={styles.fareValue}>{estimatedTime} 分</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>基本料金</Text>
              <Text style={styles.fareValue}>¥500</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>距離料金</Text>
              <Text style={styles.fareValue}>¥{Math.max(0, fare - 500).toLocaleString()}</Text>
            </View>
            <View style={[styles.fareRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>合計料金</Text>
              <Text style={styles.totalValue}>¥{fare.toLocaleString()}</Text>
            </View>
          </View>

          <Text style={styles.savings}>
            位置情報取得: {serviceStatus.jageocoder ? 'リアルタイム' : 'フォールバック'}
          </Text>

          <TouchableOpacity
            style={[styles.bookButton, isLoading && styles.disabledButton]}
            onPress={bookTaxi}
            disabled={isLoading}
          >
            <Text style={styles.bookButtonText}>
              {isLoading ? '予約処理中...' : '配車を依頼する'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showStationModal} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>駅を選択</Text>
            <TouchableOpacity onPress={() => setShowStationModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="駅名で検索..."
            value={stationSearchQuery}
            onChangeText={searchStations}
          />

          <ScrollView>
            {isLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
            ) : (
              filteredStations.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={styles.stationItem}
                  onPress={() => selectStation(station)}
                >
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    <Text style={styles.stationPrefecture}>{station.prefecture}</Text>
                  </View>
                  {location && station.lat && station.lng && (
                    <Text style={styles.stationDistance}>
                      {calculateDistance(location.latitude, location.longitude, station.lat, station.lng).toFixed(1)}km
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
            {filteredStations.length === 0 && !isLoading && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>該当する駅が見つかりません</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showAddressModal} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>目的地を入力</Text>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.addressInput}
            placeholder="住所を入力してください"
            value={customAddress}
            onChangeText={setCustomAddress}
            multiline
          />

          <View style={styles.quickAddresses}>
            <Text style={styles.quickTitle}>よく使う住所</Text>
            <TouchableOpacity
              style={styles.quickAddress}
              onPress={() => setDestination('羽田空港')}
            >
              <Text style={styles.quickAddressText}>羽田空港</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddress}
              onPress={() => setDestination('愛知県春日井市大留町5-29-20')}
            >
              <Text style={styles.quickAddressText}>愛知県春日井市大留町5-29-20</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddress}
              onPress={() => setDestination('東京ディズニーランド')}
            >
              <Text style={styles.quickAddressText}>東京ディズニーランド</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAddress}
              onPress={() => setDestination('中部国際空港')}
            >
              <Text style={styles.quickAddressText}>中部国際空港</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.setAddressButton, !customAddress && styles.disabledButton]}
            onPress={() => customAddress && setDestination(customAddress)}
            disabled={!customAddress}
          >
            <Text style={styles.setAddressButtonText}>この住所を設定</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: '#4CAF50',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  switchButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  serviceStatus: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    margin: 15,
    borderRadius: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statusTime: {
    fontSize: 12,
    color: '#666',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#333',
  },
  stationCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  inputButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputButtonTablet: {
    padding: 20,
  },
  inputButtonText: {
    fontSize: 16,
    color: '#333',
  },
  inputButtonTextTablet: {
    fontSize: 18,
  },
  fareSection: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  fareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  surgeIndicator: {
    backgroundColor: '#ff5722',
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  fareDetails: {
    marginBottom: 15,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
  },
  fareValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  savings: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modal: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 5,
  },
  searchInput: {
    margin: 15,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    fontSize: 16,
  },
  stationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stationPrefecture: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  stationDistance: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
  },
  addressInput: {
    margin: 15,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickAddresses: {
    margin: 15,
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  quickAddress: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  quickAddressText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  setAddressButton: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  setAddressButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
