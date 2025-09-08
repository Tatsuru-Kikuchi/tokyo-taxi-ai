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
  Modal,
  Platform
} from 'react-native';
import * as Location from 'expo-location';

// Smart Maps Detection - Works in both Expo Go and Production
let MapView = null;
let Marker = null;
let Polyline = null;
let PROVIDER_GOOGLE = null;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (error) {
  console.log('Maps not available in Expo Go - will work in production build');
}

const CustomerScreen = ({ onSwitchMode, onBackToSelection }) => {
  const [confirmationNumber] = useState(Math.floor(1000 + Math.random() * 9000));
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [pickupStation, setPickupStation] = useState(null);
  const [homeAddress, setHomeAddress] = useState('');
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [fare, setFare] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [showStationModal, setShowStationModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [weatherSurge, setWeatherSurge] = useState(1.0);

  const savedAddresses = [
    { id: 1, label: '自宅', address: '東京都世田谷区成城6-5-34', lat: 35.6407, lon: 139.6003 },
    { id: 2, label: '会社', address: '東京都千代田区丸の内1-6-5', lat: 35.6812, lon: 139.7649 },
  ];

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

  useEffect(() => {
    initializeLocation();
    loadNearbyDrivers();
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation.coords);
        setMapRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }
    } catch (error) {
      console.log('Location error:', error);
      // Set default location (Tokyo Station)
      const defaultLocation = { latitude: 35.6812, longitude: 139.7671 };
      setLocation(defaultLocation);
      setMapRegion({
        ...defaultLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
    setLoading(false);
  };

  const loadNearbyDrivers = () => {
    const drivers = [
      {
        id: 1,
        name: '田中運転手',
        rating: 4.8,
        eta: 2,
        carModel: 'プリウス',
        latitude: 35.6812 + (Math.random() - 0.5) * 0.01,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.01,
      },
      {
        id: 2,
        name: '佐藤運転手',
        rating: 4.9,
        eta: 3,
        carModel: 'クラウン',
        latitude: 35.6812 + (Math.random() - 0.5) * 0.01,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.01,
      },
      {
        id: 3,
        name: '鈴木運転手',
        rating: 4.7,
        eta: 5,
        carModel: 'セレナ',
        latitude: 35.6812 + (Math.random() - 0.5) * 0.01,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.01,
      },
    ];
    setNearbyDrivers(drivers);
  };

  const calculateFare = () => {
    const baseFare = 500;
    const distance = Math.random() * 5 + 2; // 2-7km
    const fareAmount = Math.round(baseFare + (distance * 400) * weatherSurge);
    setFare(fareAmount);
    return fareAmount;
  };

  const selectPickupStation = (station) => {
    setPickupStation(station);
    if (homeAddress) {
      calculateFare();
    }
    setShowStationModal(false);
  };

  const selectHomeAddress = (address) => {
    setHomeAddress(address.address);
    if (pickupStation) {
      calculateFare();
    }
    setShowAddressModal(false);
  };

  const requestRide = () => {
    if (!pickupStation || !homeAddress) {
      Alert.alert('エラー', '乗車駅と目的地を選択してください');
      return;
    }

    setBookingStatus('searching');

    setTimeout(() => {
      const driver = nearbyDrivers[Math.floor(Math.random() * nearbyDrivers.length)];
      setSelectedDriver(driver);
      setBookingStatus('confirmed');

      Alert.alert(
        '🎉 配車確定',
        `${driver.name}が${pickupStation.name}で${driver.eta}分後にお待ちしています\n\n確認番号: ${confirmationNumber}`,
        [{ text: 'OK' }]
      );
    }, 2000);
  };

  // Simple map rendering
  const renderMap = () => {
    if (MapView && mapRegion) {
      return (
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : null}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Pickup Station Marker */}
          {pickupStation && (
            <Marker
              coordinate={{
                latitude: pickupStation.lat,
                longitude: pickupStation.lon,
              }}
              title={`乗車駅: ${pickupStation.name}`}
              pinColor="blue"
            />
          )}

          {/* Home Address Marker */}
          {homeAddress && savedAddresses.map((addr) => {
            if (addr.address === homeAddress) {
              return (
                <Marker
                  key={addr.id}
                  coordinate={{
                    latitude: addr.lat,
                    longitude: addr.lon,
                  }}
                  title={`目的地: ${addr.label}`}
                  description={addr.address}
                  pinColor="green"
                />
              );
            }
            return null;
          })}

          {/* Nearby Drivers */}
          {nearbyDrivers.map((driver) => (
            <Marker
              key={driver.id}
              coordinate={{
                latitude: driver.latitude,
                longitude: driver.longitude,
              }}
              title={driver.name}
              description={`${driver.eta}分 • ⭐${driver.rating}`}
              pinColor="orange"
            />
          ))}

          {/* Route Line */}
          {pickupStation && homeAddress && (
            <Polyline
              coordinates={[
                { latitude: pickupStation.lat, longitude: pickupStation.lon },
                {
                  latitude: savedAddresses.find(a => a.address === homeAddress)?.lat || 0,
                  longitude: savedAddresses.find(a => a.address === homeAddress)?.lon || 0
                }
              ]}
              strokeColor="#667eea"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>
      );
    } else {
      // Simple placeholder when maps not available
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapTitle}>配車マップ</Text>
          {pickupStation && homeAddress && (
            <Text style={styles.routeText}>
              {pickupStation.name} → {homeAddress.split('区')[1] || '自宅'}
            </Text>
          )}
          {!pickupStation && !homeAddress && (
            <Text style={styles.mapHint}>乗車駅と目的地を選択してください</Text>
          )}
        </View>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>初期化中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🚕 お客様モード</Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>GOより ¥1,380お得!</Text>
          </View>
        </View>

        {/* Map Section */}
        <View style={styles.mapContainer}>
          {renderMap()}
        </View>

        {/* Location Selection */}
        <View style={styles.locationBox}>
          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => setShowStationModal(true)}
          >
            <Text style={styles.locationLabel}>🚉 乗車駅:</Text>
            <Text style={[styles.locationText, !pickupStation && styles.placeholderText]}>
              {pickupStation ? `${pickupStation.name}` : '駅を選択'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => setShowAddressModal(true)}
          >
            <Text style={styles.locationLabel}>🏠 目的地:</Text>
            <Text style={[styles.locationText, !homeAddress && styles.placeholderText]}>
              {homeAddress || '自宅住所を選択'}
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
              <Text style={styles.driverInfoLabel}>待ち合わせ:</Text>
              <Text style={styles.driverInfoText}>{pickupStation?.name}</Text>
            </View>
            <View style={styles.driverInfoRow}>
              <Text style={styles.driverInfoLabel}>到着時間:</Text>
              <Text style={styles.driverInfoText}>{selectedDriver.eta}分後</Text>
            </View>
            <View style={styles.driverInfoRow}>
              <Text style={styles.driverInfoLabel}>車両:</Text>
              <Text style={styles.driverInfoText}>{selectedDriver.carModel}</Text>
            </View>
          </View>
        )}

        {/* Fare Display */}
        {fare > 0 && pickupStation && homeAddress && (
          <View style={styles.fareBox}>
            <Text style={styles.fareLabel}>予想料金</Text>
            <Text style={styles.fareAmount}>¥{fare.toLocaleString()}</Text>
            <Text style={styles.savingsNote}>GOより¥1,380お得</Text>
          </View>
        )}

        {/* Available Drivers */}
        <View style={styles.driversBox}>
          <Text style={styles.driversTitle}>🚕 配車可能: {nearbyDrivers.length}台</Text>
          <View style={styles.driversRow}>
            {nearbyDrivers.map((driver, index) => (
              <View key={index} style={styles.driverItem}>
                <Text style={styles.driverItemIcon}>🚕</Text>
                <Text style={styles.driverItemText}>{driver.eta}分</Text>
                <Text style={styles.driverItemRating}>⭐{driver.rating}</Text>
              </View>
            ))}
          </View>
        </View>

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
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setBookingStatus('idle');
              setSelectedDriver(null);
              Alert.alert('キャンセル完了', '配車をキャンセルしました');
            }}
          >
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
        )}

        {/* Train Sync Feature */}
        <TouchableOpacity style={styles.trainButton}>
          <Text style={styles.trainIcon}>🚆</Text>
          <Text style={styles.trainText}>電車の到着時刻と同期</Text>
          <Text style={styles.trainSubtext}>3分前に自動配車</Text>
        </TouchableOpacity>

        {/* Mode Switch Buttons */}
        <TouchableOpacity style={styles.switchButton} onPress={onSwitchMode}>
          <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
          <Text style={styles.backButtonText}>モード選択に戻る</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Station Selection Modal */}
      <Modal visible={showStationModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>降車駅を選択</Text>
            <Text style={styles.modalSubtitle}>どちらの駅で降りますか？</Text>
            <ScrollView style={styles.stationList}>
              {POPULAR_STATIONS.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={styles.stationItem}
                  onPress={() => selectPickupStation(station)}
                >
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>🚉 {station.name}</Text>
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

      {/* Address Selection Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>目的地を選択</Text>
            <Text style={styles.modalSubtitle}>お送り先を選んでください</Text>
            {savedAddresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={styles.addressItem}
                onPress={() => selectHomeAddress(address)}
              >
                <Text style={styles.addressIcon}>
                  {address.label === '自宅' ? '🏠' : '🏢'}
                </Text>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  <Text style={styles.addressText}>{address.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addAddressButton}>
              <Text style={styles.addAddressIcon}>➕</Text>
              <Text style={styles.addAddressText}>新しい住所を追加</Text>
            </TouchableOpacity>
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
  },
  title: {
    fontSize: 24,
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
    height: 250,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 50,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  routeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  mapHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
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
    paddingVertical: 10,
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
    marginVertical: 5,
  },
  driverInfoLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  driverInfoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  fareBox: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fareLabel: {
    fontSize: 16,
    color: '#666',
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#28a745',
    marginVertical: 10,
  },
  savingsNote: {
    fontSize: 14,
    color: '#28a745',
  },
  driversBox: {
    backgroundColor: '#e7f3ff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  driversTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 10,
  },
  driversRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  driverItem: {
    alignItems: 'center',
  },
  driverItemIcon: {
    fontSize: 30,
  },
  driverItemText: {
    fontSize: 12,
    color: '#0056b3',
    fontWeight: 'bold',
  },
  driverItemRating: {
    fontSize: 10,
    color: '#666',
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
    fontSize: 18,
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
  trainButton: {
    backgroundColor: '#17a2b8',
    margin: 15,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  trainIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  trainText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trainSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 5,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  stationList: {
    maxHeight: 300,
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
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
  },
  addressIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2196f3',
    borderStyle: 'dashed',
    marginTop: 10,
    marginBottom: 10,
  },
  addAddressIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#2196f3',
  },
  addAddressText: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomerScreen;
