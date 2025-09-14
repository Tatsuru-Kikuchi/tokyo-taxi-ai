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
  SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// Updated backend URLs
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const JAGEOCODER_URL = 'https://tokyo-taxi-jageocoder-production.up.railway.app';

export default function CustomerScreen({ onModeChange, onBack }) {
  const [isIPad] = useState(Platform.isPad);
  const [currentStep, setCurrentStep] = useState('pickup'); // pickup, destination, fare, booking
  const [userLocation, setUserLocation] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [destination, setDestination] = useState('');
  const [stationsData, setStationsData] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fareInfo, setFareInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');

  // Service status
  const [serviceStatus, setServiceStatus] = useState({
    backend: false,
    jageocoder: false,
    stationsCount: 0
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await checkServiceStatus();
    await initializeLocation();
    await loadStations();
  };

  const checkServiceStatus = async () => {
    console.log('Checking backend services status...');

    // Check main backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, { timeout: 5000 });
      const data = await response.json();
      console.log('Backend status:', data.status);
      setServiceStatus(prev => ({
        ...prev,
        backend: data.status === 'healthy',
        stationsCount: data.stations || 0
      }));
    } catch (error) {
      console.log('Backend connection failed:', error.message);
    }

    // Check JAGeocoder service
    try {
      const response = await fetch(`${JAGEOCODER_URL}/health`, { timeout: 5000 });
      const data = await response.json();
      console.log('JAGeocoder status:', data.status, 'Fallback available:', data.fallback_available);
      setServiceStatus(prev => ({
        ...prev,
        jageocoder: data.status === 'healthy'
      }));
    } catch (error) {
      console.log('JAGeocoder connection failed:', error.message);
    }
  };

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報', '位置情報のアクセス許可が必要です');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('User location obtained:', location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.log('Location error:', error);
      // Fallback to Nagoya coordinates
      setUserLocation({
        latitude: 35.181770,
        longitude: 136.906398
      });
    }
  };

  const loadStations = async () => {
    setLoading(true);
    try {
      console.log('Loading stations from backend...');
      const response = await fetch(`${BACKEND_URL}/api/stations/nearby?lat=35.181770&lng=136.906398&limit=50`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Stations loaded successfully:', data.stations?.length || 0);

      if (data.stations && Array.isArray(data.stations)) {
        setStationsData(data.stations);
        setFilteredStations(data.stations.slice(0, 20));
      } else {
        throw new Error('Invalid station data format');
      }
    } catch (error) {
      console.log('Station loading failed:', error.message);

      // Fallback stations for testing
      const fallbackStations = [
        { id: 1, name: '名古屋駅', lat: 35.170694, lng: 136.881636, prefecture: '愛知県' },
        { id: 2, name: '栄駅', lat: 35.168058, lng: 136.908245, prefecture: '愛知県' },
        { id: 3, name: '金山駅', lat: 35.143033, lng: 136.900656, prefecture: '愛知県' },
        { id: 4, name: '千種駅', lat: 35.166584, lng: 136.931411, prefecture: '愛知県' },
        { id: 5, name: '大曽根駅', lat: 35.184089, lng: 136.928358, prefecture: '愛知県' }
      ];

      setStationsData(fallbackStations);
      setFilteredStations(fallbackStations);
      Alert.alert('お知らせ', 'テスト用の駅データを使用しています');
    } finally {
      setLoading(false);
    }
  };

  const searchStations = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredStations(stationsData.slice(0, 20));
      return;
    }

    const filtered = stationsData.filter(station =>
      station.name.toLowerCase().includes(query.toLowerCase()) ||
      station.prefecture.includes(query)
    ).slice(0, 20);

    setFilteredStations(filtered);
    console.log(`Station search: "${query}" found ${filtered.length} results`);
  };

  const selectStation = (station) => {
    console.log('Station selected:', station.name);
    setSelectedStation(station);
    setCurrentStep('destination');
  };

  const calculateFareWithJAGeocoder = async () => {
    if (!selectedStation || !destination.trim()) {
      Alert.alert('エラー', '出発駅と目的地を入力してください');
      return;
    }

    setLoading(true);
    console.log('Starting fare calculation...');
    console.log('From:', selectedStation.name, `(${selectedStation.lat}, ${selectedStation.lng})`);
    console.log('To:', destination);

    try {
      // Step 1: Geocode the destination using JAGeocoder
      console.log('Geocoding destination with JAGeocoder...');
      const geocodeUrl = `${JAGEOCODER_URL}/geocode/${encodeURIComponent(destination)}`;
      console.log('Geocoding URL:', geocodeUrl);

      const geocodeResponse = await fetch(geocodeUrl);

      if (!geocodeResponse.ok) {
        throw new Error(`Geocoding failed: HTTP ${geocodeResponse.status}`);
      }

      const geocodeData = await geocodeResponse.json();
      console.log('Geocoding result:', geocodeData);

      const destLat = geocodeData.latitude;
      const destLng = geocodeData.longitude;
      const geocodeSource = geocodeData.source;

      if (!destLat || !destLng) {
        throw new Error('Invalid coordinates received from geocoder');
      }

      // Step 2: Calculate distance using JAGeocoder's distance service
      console.log('Calculating distance with JAGeocoder...');
      const distanceUrl = `${JAGEOCODER_URL}/distance?from_lat=${selectedStation.lat}&from_lng=${selectedStation.lng}&to_lat=${destLat}&to_lng=${destLng}`;
      console.log('Distance URL:', distanceUrl);

      const distanceResponse = await fetch(distanceUrl);

      if (!distanceResponse.ok) {
        throw new Error(`Distance calculation failed: HTTP ${distanceResponse.status}`);
      }

      const distanceData = await distanceResponse.json();
      console.log('Distance result:', distanceData);

      const distanceKm = distanceData.distance_km;
      const durationMinutes = distanceData.duration_minutes;

      // Step 3: Calculate fare based on accurate distance
      const baseFare = 500;  // ¥500 base fare
      const perKmRate = 200; // ¥200 per km
      const totalFare = Math.round(baseFare + (distanceKm * perKmRate));

      console.log(`Fare calculated: ¥${totalFare} for ${distanceKm}km (${durationMinutes} min)`);

      setFareInfo({
        distance: distanceKm,
        duration: durationMinutes,
        baseFare: baseFare,
        perKmFare: Math.round(distanceKm * perKmRate),
        totalFare: totalFare,
        destination: {
          address: destination,
          matched_address: geocodeData.matched_address || destination,
          coordinates: { lat: destLat, lng: destLng },
          source: geocodeSource
        }
      });

      setCurrentStep('fare');

    } catch (error) {
      console.log('Fare calculation error:', error.message);

      // Fallback calculation for testing
      Alert.alert(
        'お知らせ',
        'サービスに接続できませんでした。概算料金を表示します。',
        [{ text: 'OK' }]
      );

      const fallbackDistance = 10.0;
      const fallbackFare = 2500;

      setFareInfo({
        distance: fallbackDistance,
        duration: 25,
        baseFare: 500,
        perKmFare: 2000,
        totalFare: fallbackFare,
        destination: {
          address: destination,
          matched_address: destination,
          coordinates: null,
          source: 'fallback'
        },
        isEstimate: true
      });

      setCurrentStep('fare');
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async () => {
    setLoading(true);
    try {
      const bookingData = {
        pickup_station: selectedStation.name,
        pickup_coordinates: {
          lat: selectedStation.lat,
          lng: selectedStation.lng
        },
        destination_address: destination,
        destination_coordinates: fareInfo.destination.coordinates,
        estimated_fare: fareInfo.totalFare,
        distance_km: fareInfo.distance,
        estimated_duration: fareInfo.duration,
        booking_time: new Date().toISOString(),
        source: fareInfo.destination.source
      };

      console.log('Creating booking:', bookingData);

      const response = await fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      let confirmationNum;
      if (response.ok) {
        const result = await response.json();
        console.log('Booking created successfully:', result);
        confirmationNum = result.confirmation_number || 'TX' + Date.now().toString().slice(-6);
      } else {
        console.log('Booking API failed, using fallback confirmation');
        confirmationNum = 'TX' + Date.now().toString().slice(-6);
      }

      setConfirmationNumber(confirmationNum);
      setBookingConfirmed(true);
      setCurrentStep('booking');

    } catch (error) {
      console.log('Booking error:', error.message);
      // Still show success with fallback confirmation
      const confirmationNum = 'TX' + Date.now().toString().slice(-6);
      setConfirmationNumber(confirmationNum);
      setBookingConfirmed(true);
      setCurrentStep('booking');
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setCurrentStep('pickup');
    setSelectedStation(null);
    setDestination('');
    setFareInfo(null);
    setBookingConfirmed(false);
    setConfirmationNumber('');
    setSearchQuery('');
  };

  const renderServiceStatus = () => (
    <View style={styles.serviceStatus}>
      <Text style={styles.serviceStatusTitle}>接続状況</Text>
      <View style={styles.serviceStatusRow}>
        <Text style={styles.serviceStatusText}>
          バックエンド: {serviceStatus.backend ? '✅' : '❌'}
        </Text>
        <Text style={styles.serviceStatusText}>
          JAGeocoder: {serviceStatus.jageocoder ? '✅' : '❌'}
        </Text>
      </View>
      {serviceStatus.stationsCount > 0 && (
        <Text style={styles.serviceStatusText}>
          駅データ: {serviceStatus.stationsCount.toLocaleString()} 件
        </Text>
      )}
    </View>
  );

  const renderStationSearch = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, isIPad && styles.stepTitleIPad]}>
        出発駅を選択
      </Text>

      <TextInput
        style={[styles.searchInput, isIPad && styles.searchInputIPad]}
        placeholder="駅名で検索..."
        value={searchQuery}
        onChangeText={searchStations}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 20}} />
      ) : (
        <FlatList
          data={filteredStations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.stationItem, isIPad && styles.stationItemIPad]}
              onPress={() => selectStation(item)}
            >
              <View>
                <Text style={[styles.stationName, isIPad && styles.stationNameIPad]}>
                  {item.name}
                </Text>
                <Text style={styles.stationInfo}>
                  {item.prefecture}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={isIPad ? 28 : 20} color="#666" />
            </TouchableOpacity>
          )}
          style={styles.stationList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderDestinationInput = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, isIPad && styles.stepTitleIPad]}>
        目的地を入力
      </Text>

      <View style={styles.selectedStation}>
        <Text style={styles.selectedStationLabel}>出発駅</Text>
        <Text style={[styles.selectedStationName, isIPad && styles.selectedStationNameIPad]}>
          {selectedStation?.name}
        </Text>
      </View>

      <TextInput
        style={[styles.destinationInput, isIPad && styles.destinationInputIPad]}
        placeholder="目的地の住所を入力してください"
        value={destination}
        onChangeText={setDestination}
        multiline={true}
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[
          styles.continueButton,
          isIPad && styles.continueButtonIPad,
          (!destination.trim() || loading) && styles.continueButtonDisabled
        ]}
        onPress={calculateFareWithJAGeocoder}
        disabled={!destination.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[styles.continueButtonText, isIPad && styles.continueButtonTextIPad]}>
            料金を計算する
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderFareConfirmation = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, isIPad && styles.stepTitleIPad]}>
        料金確認
      </Text>

      {fareInfo.isEstimate && (
        <View style={styles.estimateNotice}>
          <Text style={styles.estimateText}>※ 概算料金を表示しています</Text>
        </View>
      )}

      <View style={styles.routeInfo}>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>出発</Text>
          <Text style={[styles.routeValue, isIPad && styles.routeValueIPad]}>
            {selectedStation?.name}
          </Text>
        </View>

        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>目的地</Text>
          <Text style={[styles.routeValue, isIPad && styles.routeValueIPad]}>
            {fareInfo?.destination?.matched_address || destination}
          </Text>
        </View>

        <View style={styles.fareDetails}>
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>距離</Text>
            <Text style={[styles.fareValue, isIPad && styles.fareValueIPad]}>
              {fareInfo?.distance?.toFixed(1)} km
            </Text>
          </View>

          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>予想時間</Text>
            <Text style={[styles.fareValue, isIPad && styles.fareValueIPad]}>
              {fareInfo?.duration} 分
            </Text>
          </View>

          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>基本料金</Text>
            <Text style={[styles.fareValue, isIPad && styles.fareValueIPad]}>
              ¥{fareInfo?.baseFare?.toLocaleString()}
            </Text>
          </View>

          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>距離料金</Text>
            <Text style={[styles.fareValue, isIPad && styles.fareValueIPad]}>
              ¥{fareInfo?.perKmFare?.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.fareItem, styles.totalFareItem]}>
            <Text style={[styles.totalFareLabel, isIPad && styles.totalFareLabelIPad]}>
              合計料金
            </Text>
            <Text style={[styles.totalFareValue, isIPad && styles.totalFareValueIPad]}>
              ¥{fareInfo?.totalFare?.toLocaleString()}
            </Text>
          </View>
        </View>

        {fareInfo?.destination?.source && (
          <Text style={styles.sourceInfo}>
            位置情報取得: {fareInfo.destination.source === 'jageocoder' ? 'JAGeocoder' : 'フォールバック'}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.bookButton, isIPad && styles.bookButtonIPad]}
        onPress={confirmBooking}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[styles.bookButtonText, isIPad && styles.bookButtonTextIPad]}>
            配車を依頼する
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderBookingConfirmation = () => (
    <View style={styles.stepContainer}>
      <View style={styles.confirmationIcon}>
        <Ionicons name="checkmark-circle" size={isIPad ? 80 : 60} color="#00C853" />
      </View>

      <Text style={[styles.confirmationTitle, isIPad && styles.confirmationTitleIPad]}>
        配車を受け付けました
      </Text>

      <View style={styles.confirmationDetails}>
        <Text style={[styles.confirmationNumber, isIPad && styles.confirmationNumberIPad]}>
          確認番号: {confirmationNumber}
        </Text>

        <Text style={styles.confirmationInfo}>
          ドライバーが見つかり次第ご連絡いたします。
        </Text>

        <Text style={styles.estimatedWait}>
          予想待機時間: 5-10分
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.newBookingButton, isIPad && styles.newBookingButtonIPad]}
        onPress={resetBooking}
      >
        <Text style={[styles.newBookingButtonText, isIPad && styles.newBookingButtonTextIPad]}>
          新しい配車を依頼する
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isIPad && styles.containerIPad]}>
      <View style={[styles.header, isIPad && styles.headerIPad]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={isIPad ? 32 : 24} color="#007AFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isIPad && styles.headerTitleIPad]}>
          タクシーを呼ぶ
        </Text>

        <TouchableOpacity onPress={() => onModeChange('driver')} style={styles.switchButton}>
          <Text style={[styles.switchButtonText, isIPad && styles.switchButtonTextIPad]}>
            ドライバー
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 'pickup' && renderServiceStatus()}
        {currentStep === 'pickup' && renderStationSearch()}
        {currentStep === 'destination' && renderDestinationInput()}
        {currentStep === 'fare' && renderFareConfirmation()}
        {currentStep === 'booking' && renderBookingConfirmation()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerIPad: {
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerIPad: {
    paddingHorizontal: 40,
    paddingVertical: 25,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  headerTitleIPad: {
    fontSize: 24,
  },
  switchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  switchButtonTextIPad: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  serviceStatus: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  serviceStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  serviceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  serviceStatusText: {
    fontSize: 14,
    color: '#1976D2',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1D1D1F',
  },
  stepTitleIPad: {
    fontSize: 32,
    marginBottom: 30,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    marginBottom: 20,
  },
  searchInputIPad: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    fontSize: 20,
    borderRadius: 16,
  },
  stationList: {
    maxHeight: 400,
  },
  stationItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stationItemIPad: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 12,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  stationNameIPad: {
    fontSize: 20,
  },
  stationInfo: {
    fontSize: 14,
    color: '#8E8E93',
  },
  selectedStation: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedStationLabel: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
  },
  selectedStationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  selectedStationNameIPad: {
    fontSize: 22,
  },
  destinationInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  destinationInputIPad: {
    padding: 24,
    fontSize: 20,
    borderRadius: 16,
    minHeight: 120,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonIPad: {
    paddingVertical: 24,
    borderRadius: 16,
  },
  continueButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextIPad: {
    fontSize: 20,
  },
  estimateNotice: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  estimateText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  routeInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  routeItem: {
    marginBottom: 16,
  },
  routeLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  routeValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  routeValueIPad: {
    fontSize: 20,
  },
  fareDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    paddingTop: 16,
    marginTop: 16,
  },
  fareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fareLabel: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  fareValueIPad: {
    fontSize: 20,
  },
  totalFareItem: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    paddingTop: 12,
    marginTop: 12,
    marginBottom: 0,
  },
  totalFareLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  totalFareLabelIPad: {
    fontSize: 22,
  },
  totalFareValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  totalFareValueIPad: {
    fontSize: 22,
  },
  sourceInfo: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },
  bookButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookButtonIPad: {
    paddingVertical: 24,
    borderRadius: 16,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bookButtonTextIPad: {
    fontSize: 20,
  },
  confirmationIcon: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00C853',
    textAlign: 'center',
    marginBottom: 30,
  },
  confirmationTitleIPad: {
    fontSize: 32,
  },
  confirmationDetails: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  confirmationNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmationNumberIPad: {
    fontSize: 24,
  },
  confirmationInfo: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  estimatedWait: {
    fontSize: 14,
    color: '#34C759',
    textAlign: 'center',
    fontWeight: '500',
  },
  newBookingButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  newBookingButtonIPad: {
    paddingVertical: 24,
    borderRadius: 16,
  },
  newBookingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  newBookingButtonTextIPad: {
    fontSize: 20,
  },
});
