import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Dimensions
} from 'react-native';
import * as Location from 'expo-location';

// Get screen dimensions for iPad compatibility
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const CustomerScreen = ({ onSwitchMode, onBackToSelection }) => {
  // Default props to prevent undefined crashes
  const handleSwitchMode = onSwitchMode || (() => console.log('Switch mode'));
  const handleBackToSelection = onBackToSelection || (() => console.log('Back'));

  // State management
  const [confirmationNumber] = useState(Math.floor(1000 + Math.random() * 9000));
  const [location, setLocation] = useState(null);
  const [pickupStation, setPickupStation] = useState(null);
  const [homeAddress, setHomeAddress] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [fare, setFare] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [showStationModal, setShowStationModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [weatherSurge, setWeatherSurge] = useState(1.15);

  // Popular stations in Tokyo
  const POPULAR_STATIONS = [
    { id: 1, name: '東京駅', lat: 35.6812, lon: 139.7671, district: '千代田区' },
    { id: 2, name: '新宿駅', lat: 35.6896, lon: 139.7006, district: '新宿区' },
    { id: 3, name: '渋谷駅', lat: 35.6580, lon: 139.7016, district: '渋谷区' },
    { id: 4, name: '品川駅', lat: 35.6285, lon: 139.7387, district: '港区' },
    { id: 5, name: '池袋駅', lat: 35.7295, lon: 139.7109, district: '豊島区' },
    { id: 6, name: '上野駅', lat: 35.7141, lon: 139.7774, district: '台東区' },
    { id: 7, name: '秋葉原駅', lat: 35.6984, lon: 139.7731, district: '千代田区' },
    { id: 8, name: '六本木駅', lat: 35.6626, lon: 139.7313, district: '港区' },
  ];

  // Common home addresses
  const HOME_ADDRESSES = [
    { id: 1, name: '自宅', address: '東京都渋谷区恵比寿1-2-3', type: 'home' },
    { id: 2, name: 'オフィス', address: '東京都千代田区丸の内1-1-1', type: 'office' },
    { id: 3, name: '実家', address: '東京都世田谷区三軒茶屋2-3-4', type: 'parents' },
    { id: 4, name: '自宅マンション', address: '東京都港区六本木3-4-5', type: 'home' },
    { id: 5, name: 'カスタム住所を入力', address: '', type: 'custom' },
  ];

  useEffect(() => {
    initializeLocation();
    loadNearbyDrivers();
    checkWeatherSurge();
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '位置情報の許可が必要',
          'タクシーの配車には位置情報が必要です',
          [{ text: 'OK' }]
        );
        setDefaultLocation();
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setLoading(false);
    } catch (error) {
      console.log('Location error:', error);
      setDefaultLocation();
    }
  };

  const setDefaultLocation = () => {
    setLocation({ latitude: 35.6812, longitude: 139.7671 });
    setLoading(false);
  };

  const loadNearbyDrivers = () => {
    const mockDrivers = [
      {
        id: 1,
        name: '田中運転手',
        rating: 4.8,
        eta: 2,
        carModel: 'トヨタ プリウス',
        plateNumber: '品川 500 あ 12-34',
      },
      {
        id: 2,
        name: '佐藤運転手',
        rating: 4.9,
        eta: 3,
        carModel: 'トヨタ クラウン',
        plateNumber: '品川 500 い 56-78',
      },
      {
        id: 3,
        name: '鈴木運転手',
        rating: 4.7,
        eta: 5,
        carModel: 'ニッサン セレナ',
        plateNumber: '品川 500 う 90-12',
      },
    ];
    setNearbyDrivers(mockDrivers);
  };

  const checkWeatherSurge = () => {
    const weatherConditions = ['clear', 'light_rain', 'heavy_rain'];
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

    switch(randomWeather) {
      case 'light_rain':
        setWeatherSurge(1.15);
        break;
      case 'heavy_rain':
        setWeatherSurge(1.30);
        break;
      default:
        setWeatherSurge(1.0);
    }
  };

  const calculateFare = () => {
    if (!pickupStation || !homeAddress) return 0;

    // Simple fare calculation
    const baseFare = 500;
    const distance = Math.random() * 10 + 2; // 2-12km
    const perKm = 400;
    const appFee = 100;

    const subtotal = baseFare + (distance * perKm) + appFee;
    return Math.round(subtotal * weatherSurge);
  };

  const selectStation = (station) => {
    setPickupStation(station);
    setShowStationModal(false);

    if (homeAddress) {
      const estimatedFare = calculateFare();
      setFare(estimatedFare);
    }
  };

  const selectHomeAddress = (address) => {
    if (address.type === 'custom') {
      Alert.prompt(
        'カスタム住所',
        '配送先の住所を入力してください',
        (text) => {
          setHomeAddress({ ...address, address: text });
          setShowAddressModal(false);
          if (pickupStation) {
            const estimatedFare = calculateFare();
            setFare(estimatedFare);
          }
        }
      );
    } else {
      setHomeAddress(address);
      setShowAddressModal(false);

      if (pickupStation) {
        const estimatedFare = calculateFare();
        setFare(estimatedFare);
      }
    }
  };

  const requestRide = () => {
    if (!pickupStation || !homeAddress) {
      Alert.alert('エラー', '乗車駅と目的地を選択してください');
      return;
    }

    setBookingStatus('searching');

    setTimeout(() => {
      const randomDriver = nearbyDrivers[Math.floor(Math.random() * nearbyDrivers.length)];
      setSelectedDriver(randomDriver);
      setBookingStatus('confirmed');

      Alert.alert(
        '🎉 配車確定',
        `${randomDriver.name}が${randomDriver.eta}分で到着します\n\n確認番号: ${confirmationNumber}\n\n💰 GOより¥1,380お得！`,
        [{ text: 'OK' }]
      );
    }, 2000);
  };

  const cancelBooking = () => {
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
            setPickupStation(null);
            setHomeAddress(null);
            setFare(0);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>位置情報を取得中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isTablet && styles.containerTablet]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={isTablet && styles.scrollViewTablet}>
        <View style={[styles.content, isTablet && styles.contentTablet]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🚕 お客様モード</Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>GOより ¥1,380お得!</Text>
            </View>
          </View>

          {/* Map Placeholder */}
          <View style={[styles.mapContainer, isTablet && styles.mapContainerTablet]}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapIcon}>🗺️</Text>
              <Text style={styles.mapPlaceholderTitle}>配車マップ</Text>
              <Text style={styles.mapPlaceholderText}>
                駅から自宅への配車
              </Text>
              {nearbyDrivers.length > 0 && (
                <View style={styles.driversPreview}>
                  {nearbyDrivers.map((driver, index) => (
                    <View key={index} style={styles.driverPreviewItem}>
                      <Text style={styles.driverIcon}>🚕</Text>
                      <Text style={styles.driverEta}>{driver.eta}分</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Location Selection */}
          <View style={styles.locationBox}>
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => setShowStationModal(true)}
            >
              <Text style={styles.locationLabel}>🚉 乗車駅:</Text>
              <Text style={[
                styles.locationText,
                !pickupStation && styles.placeholderText
              ]}>
                {pickupStation ? `${pickupStation.name} (${pickupStation.district})` : 'タップして駅を選択'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => setShowAddressModal(true)}
            >
              <Text style={styles.locationLabel}>🏠 目的地:</Text>
              <Text style={[
                styles.locationText,
                !homeAddress && styles.placeholderText
              ]}>
                {homeAddress ? homeAddress.address : 'タップして自宅住所を選択'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Confirmation Number */}
          {bookingStatus === 'confirmed' && (
            <View style={styles.confirmationBox}>
              <Text style={styles.confirmationLabel}>確認番号</Text>
              <Text style={styles.confirmationNumber}>{confirmationNumber}</Text>
              <Text style={styles.confirmationHint}>ドライバーにこの番号を見せてください</Text>
            </View>
          )}

          {/* Driver Info */}
          {selectedDriver && bookingStatus === 'confirmed' && (
            <View style={styles.driverInfoBox}>
              <Text style={styles.driverInfoTitle}>🚕 配車確定</Text>
              <View style={styles.driverInfoRow}>
                <Text style={styles.driverInfoLabel}>運転手:</Text>
                <Text style={styles.driverInfoText}>{selectedDriver.name}</Text>
              </View>
              <View style={styles.driverInfoRow}>
                <Text style={styles.driverInfoLabel}>到着時間:</Text>
                <Text style={styles.driverInfoText}>{selectedDriver.eta}分</Text>
              </View>
              <View style={styles.driverInfoRow}>
                <Text style={styles.driverInfoLabel}>車両:</Text>
                <Text style={styles.driverInfoText}>{selectedDriver.carModel}</Text>
              </View>
            </View>
          )}

          {/* Fare Display */}
          {pickupStation && homeAddress && (
            <View style={styles.fareBox}>
              <Text style={styles.fareLabel}>料金計算</Text>
              <View style={styles.fareRow}>
                <Text style={styles.fareText}>予想料金</Text>
                <Text style={styles.fareAmount}>¥{fare.toLocaleString()}</Text>
              </View>
              {weatherSurge > 1 && (
                <Text style={styles.fareNote}>
                  ☔ 雨天料金 (+{Math.round((weatherSurge - 1) * 100)}%)
                </Text>
              )}
              <View style={styles.savingsInfo}>
                <Text style={styles.savingsLabel}>💰 節約額:</Text>
                <Text style={styles.savingsValue}>¥1,380 (GO比)</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          {bookingStatus === 'idle' && (
            <TouchableOpacity
              style={[styles.bookButton, (!pickupStation || !homeAddress) && styles.bookButtonDisabled]}
              onPress={requestRide}
              disabled={!pickupStation || !homeAddress}
            >
              <Text style={styles.bookButtonText}>
                {pickupStation && homeAddress ? '配車をリクエスト' : '乗車駅と目的地を選択してください'}
              </Text>
            </TouchableOpacity>
          )}

          {bookingStatus === 'searching' && (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.searchingText}>ドライバーを探しています...</Text>
            </View>
          )}

          {bookingStatus === 'confirmed' && (
            <TouchableOpacity style={styles.cancelButton} onPress={cancelBooking}>
              <Text style={styles.cancelButtonText}>予約をキャンセル</Text>
            </TouchableOpacity>
          )}

          {/* Mode Switch Buttons */}
          <TouchableOpacity style={styles.switchButton} onPress={handleSwitchMode}>
            <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleBackToSelection}>
            <Text style={styles.backButtonText}>モード選択に戻る</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Station Selection Modal */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <Text style={styles.modalTitle}>乗車駅を選択</Text>
            <ScrollView style={styles.stationList}>
              {POPULAR_STATIONS.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={styles.stationItem}
                  onPress={() => selectStation(station)}
                >
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    <Text style={styles.stationDistrict}>{station.district}</Text>
                  </View>
                  <Text style={styles.stationArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStationModal(false)}
            >
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Home Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <Text style={styles.modalTitle}>目的地（自宅）を選択</Text>
            <ScrollView style={styles.stationList}>
              {HOME_ADDRESSES.map((address) => (
                <TouchableOpacity
                  key={address.id}
                  style={styles.stationItem}
                  onPress={() => selectHomeAddress(address)}
                >
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>
                      {address.type === 'home' && '🏠 '}
                      {address.type === 'office' && '🏢 '}
                      {address.type === 'parents' && '👨‍👩‍👧 '}
                      {address.type === 'custom' && '✏️ '}
                      {address.name}
                    </Text>
                    <Text style={styles.stationDistrict}>{address.address}</Text>
                  </View>
                  <Text style={styles.stationArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddressModal(false)}
            >
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  containerTablet: {
    backgroundColor: '#f0f0f0',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewTablet: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  content: {
    flex: 1,
  },
  contentTablet: {
    width: '100%',
    maxWidth: 768,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#667eea',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderRadius: isTablet ? 10 : 0,
    marginBottom: isTablet ? 20 : 0,
  },
  title: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  savingsBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  savingsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mapContainer: {
    height: 300,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  mapContainerTablet: {
    height: 400,
    marginHorizontal: 0,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
  },
  mapIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#666',
  },
  driversPreview: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 15,
  },
  driverPreviewItem: {
    alignItems: 'center',
  },
  driverIcon: {
    fontSize: 30,
  },
  driverEta: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: 'bold',
  },
  locationBox: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationLabel: {
    fontSize: 14,
    width: 80,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
    fontStyle: 'italic',
  },
  confirmationBox: {
    backgroundColor: '#002060',
    margin: 15,
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
  },
  confirmationLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 10,
  },
  confirmationNumber: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 5,
  },
  confirmationHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 10,
  },
  driverInfoBox: {
    backgroundColor: '#e8f4fd',
    margin: 15,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  driverInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976d2',
  },
  driverInfoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  driverInfoLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  driverInfoText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  fareBox: {
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
  fareLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fareText: {
    fontSize: 14,
    color: '#6c757d',
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
  },
  fareNote: {
    fontSize: 12,
    color: '#ffc107',
    marginTop: 10,
  },
  savingsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  savingsLabel: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  savingsValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#28a745',
    margin: 15,
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: 'white',
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
  },
  searchingContainer: {
    margin: 15,
    padding: 20,
    alignItems: 'center',
  },
  searchingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#667eea',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    margin: 15,
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    backgroundColor: '#ff6b6b',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  switchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#6c757d',
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    padding: 20,
    maxHeight: '70%',
  },
  modalContentTablet: {
    maxHeight: '80%',
    marginHorizontal: 100,
    marginBottom: 50,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  stationList: {
    maxHeight: 400,
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
  stationDistrict: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  stationArrow: {
    fontSize: 20,
    color: '#667eea',
  },
  modalCloseButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomerScreen;
