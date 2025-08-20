<<<<<<< HEAD
=======
// CustomerScreen.js - Production Ready with Smart Maps
>>>>>>> origin/main
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
<<<<<<< HEAD
  TextInput,
  Platform,
  Modal,
  Image
} from 'react-native';
import * as Location from 'expo-location';

// Smart Maps Detection - Works in both Expo Go and Production
=======
  Platform,
  Modal
} from 'react-native';
import * as Location from 'expo-location';

// Smart Maps Detection
>>>>>>> origin/main
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
<<<<<<< HEAD
  console.log('Maps not available in Expo Go - will work in production build');
}

const CustomerScreen = ({ onSwitchMode, onBackToSelection }) => {
  // State management
=======
  console.log('Maps not available in Expo Go - will work in production');
}

const CustomerScreen = ({ onSwitchMode, onBackToSelection }) => {
>>>>>>> origin/main
  const [confirmationNumber] = useState(Math.floor(1000 + Math.random() * 9000));
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [fare, setFare] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [pickupAddress, setPickupAddress] = useState('現在地を取得中...');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [showDestinationModal, setShowDestinationModal] = useState(false);
<<<<<<< HEAD
  const [weatherSurge, setWeatherSurge] = useState(1.15); // 15% rain surge
  const [selectedStation, setSelectedStation] = useState(null);

  // Popular stations in Tokyo
=======
  const [weatherSurge, setWeatherSurge] = useState(1.15);

>>>>>>> origin/main
  const POPULAR_STATIONS = [
    { id: 1, name: '東京駅', lat: 35.6812, lon: 139.7671, district: '千代田区' },
    { id: 2, name: '新宿駅', lat: 35.6896, lon: 139.7006, district: '新宿区' },
    { id: 3, name: '渋谷駅', lat: 35.6580, lon: 139.7016, district: '渋谷区' },
    { id: 4, name: '品川駅', lat: 35.6285, lon: 139.7387, district: '港区' },
    { id: 5, name: '池袋駅', lat: 35.7295, lon: 139.7109, district: '豊島区' },
<<<<<<< HEAD
    { id: 6, name: '上野駅', lat: 35.7141, lon: 139.7774, district: '台東区' },
    { id: 7, name: '秋葉原駅', lat: 35.6984, lon: 139.7731, district: '千代田区' },
    { id: 8, name: '六本木駅', lat: 35.6626, lon: 139.7313, district: '港区' },
=======
>>>>>>> origin/main
  ];

  // Component mount
  useEffect(() => {
    initializeLocation();
    loadNearbyDrivers();
<<<<<<< HEAD
    checkWeatherSurge();
  }, []);

  // Initialize location
=======
  }, []);

>>>>>>> origin/main
  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
<<<<<<< HEAD
        Alert.alert(
          '位置情報の許可が必要',
          'タクシーの配車には位置情報が必要です',
          [{ text: 'OK' }]
        );
        // Use Tokyo Station as default
=======
>>>>>>> origin/main
        setDefaultLocation();
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
<<<<<<< HEAD

      setLocation(coords);
      setMapRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Get address
      try {
        const address = await Location.reverseGeocodeAsync(coords);
        if (address[0]) {
          setPickupAddress(
            `${address[0].city || ''}${address[0].street || ''}${address[0].name || ''}`
          );
        }
      } catch (error) {
        setPickupAddress('東京都内');
      }

      setLoading(false);
    } catch (error) {
      console.log('Location error:', error);
=======

      setLocation(coords);
      setMapRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setPickupAddress('現在地');
      setLoading(false);
    } catch (error) {
>>>>>>> origin/main
      setDefaultLocation();
    }
  };

<<<<<<< HEAD
  // Set default location (Tokyo Station)
  const setDefaultLocation = () => {
    const tokyoStation = {
      latitude: 35.6812,
      longitude: 139.7671,
    };
=======
  const setDefaultLocation = () => {
    const tokyoStation = { latitude: 35.6812, longitude: 139.7671 };
>>>>>>> origin/main
    setLocation(tokyoStation);
    setMapRegion({
      ...tokyoStation,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setPickupAddress('東京駅周辺');
    setLoading(false);
<<<<<<< HEAD
  };

  // Load nearby drivers
  const loadNearbyDrivers = () => {
    const mockDrivers = [
      {
        id: 1,
        name: '田中運転手',
        rating: 4.8,
        eta: 2,
        latitude: 35.6812 + (Math.random() - 0.5) * 0.01,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.01,
        carModel: 'トヨタ プリウス',
        plateNumber: '品川 500 あ 12-34',
      },
      {
        id: 2,
        name: '佐藤運転手',
        rating: 4.9,
        eta: 3,
        latitude: 35.6812 + (Math.random() - 0.5) * 0.01,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.01,
        carModel: 'トヨタ クラウン',
        plateNumber: '品川 500 い 56-78',
      },
      {
        id: 3,
        name: '鈴木運転手',
        rating: 4.7,
        eta: 5,
        latitude: 35.6812 + (Math.random() - 0.5) * 0.01,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.01,
        carModel: 'ニッサン セレナ',
        plateNumber: '品川 500 う 90-12',
      },
    ];
    setNearbyDrivers(mockDrivers);
  };

  // Check weather for surge pricing
  const checkWeatherSurge = () => {
    // Simulate weather check
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

  // Calculate fare
  const calculateFare = (start, end) => {
    if (!start || !end) return 0;
    
    const R = 6371;
    const dLat = (end.latitude - start.latitude) * Math.PI / 180;
    const dLon = (end.longitude - start.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(start.latitude * Math.PI / 180) * Math.cos(end.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    const baseFare = 500;
    const perKm = 400;
    const appFee = 100; // Our fee (vs GO's ¥500)
    
    const subtotal = baseFare + (distance * perKm) + appFee;
    const totalFare = Math.round(subtotal * weatherSurge);
    
    return totalFare;
  };

  // Select station as destination
  const selectStation = (station) => {
    const stationCoords = {
      latitude: station.lat,
      longitude: station.lon,
    };
    setDestination(stationCoords);
    setDestinationAddress(`${station.name} (${station.district})`);
    setSelectedStation(station);
    
    if (location) {
      const estimatedFare = calculateFare(location, stationCoords);
      setFare(estimatedFare);
    }
    
    setShowDestinationModal(false);
  };

  // Request ride
=======
  };

  const loadNearbyDrivers = () => {
    const mockDrivers = [
      {
        id: 1,
        name: '田中運転手',
        rating: 4.8,
        eta: 2,
        latitude: 35.6812 + (Math.random() - 0.5) * 0.01,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.01,
        carModel: 'トヨタ プリウス',
        plateNumber: '品川 500 あ 12-34',
      },
      {
        id: 2,
        name: '佐藤運転手',
        rating: 4.9,
        eta: 3,
        latitude: 35.6812 + (Math.random() - 0.5) * 0.01,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.01,
        carModel: 'トヨタ クラウン',
        plateNumber: '品川 500 い 56-78',
      },
    ];
    setNearbyDrivers(mockDrivers);
  };

  const calculateFare = (start, end) => {
    if (!start || !end) return 0;
    const R = 6371;
    const dLat = (end.latitude - start.latitude) * Math.PI / 180;
    const dLon = (end.longitude - start.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(start.latitude * Math.PI / 180) * Math.cos(end.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    const baseFare = 500;
    const perKm = 400;
    const appFee = 100;
    const subtotal = baseFare + (distance * perKm) + appFee;
    const totalFare = Math.round(subtotal * weatherSurge);
    return totalFare;
  };

  const selectStation = (station) => {
    const stationCoords = {
      latitude: station.lat,
      longitude: station.lon,
    };
    setDestination(stationCoords);
    setDestinationAddress(`${station.name} (${station.district})`);
    
    if (location) {
      const estimatedFare = calculateFare(location, stationCoords);
      setFare(estimatedFare);
    }
    
    setShowDestinationModal(false);
  };

>>>>>>> origin/main
  const requestRide = () => {
    if (!destination) {
      Alert.alert('エラー', '目的地を選択してください');
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
<<<<<<< HEAD
=======
      );
    }, 2000);
  };

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
          {location && (
            <Marker coordinate={location} title="現在地" pinColor="blue" />
          )}
          {destination && (
            <Marker coordinate={destination} title="目的地" pinColor="green" />
          )}
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
        </MapView>
      );
    } else {
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapPlaceholderTitle}>マップ</Text>
          <Text style={styles.mapPlaceholderText}>
            {loading ? '位置情報を取得中...' : '配車位置を表示'}
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
>>>>>>> origin/main
      );
    }, 2000);
  };

<<<<<<< HEAD
  // Cancel booking
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
            setDestination(null);
            setDestinationAddress('');
            setSelectedStation(null);
            setFare(0);
          }
        }
      ]
    );
  };

  // Render map or placeholder
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
          {location && (
            <Marker
              coordinate={location}
              title="現在地"
              pinColor="blue"
            />
          )}
          {destination && (
            <Marker
              coordinate={destination}
              title="目的地"
              pinColor="green"
            />
          )}
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
          {location && destination && (
            <Polyline
              coordinates={[location, destination]}
              strokeColor="#667eea"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>
      );
    } else {
      // Fallback for Expo Go or when maps not available
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapPlaceholderTitle}>マップ</Text>
          <Text style={styles.mapPlaceholderText}>
            {loading ? '位置情報を取得中...' : '配車位置を表示'}
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
      );
    }
  };

=======
>>>>>>> origin/main
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
<<<<<<< HEAD
        {/* Header */}
=======
>>>>>>> origin/main
        <View style={styles.header}>
          <Text style={styles.title}>🚕 お客様モード</Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>GOより ¥1,380お得!</Text>
          </View>
        </View>

<<<<<<< HEAD
        {/* Map View */}
=======
>>>>>>> origin/main
        <View style={styles.mapContainer}>
          {renderMap()}
        </View>

<<<<<<< HEAD
        {/* Location Selection */}
=======
>>>>>>> origin/main
        <View style={styles.locationBox}>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>🔵 乗車地:</Text>
            <Text style={styles.locationText}>{pickupAddress}</Text>
<<<<<<< HEAD
          </View>
          <TouchableOpacity 
            style={styles.locationRow}
            onPress={() => setShowDestinationModal(true)}
          >
            <Text style={styles.locationLabel}>🟢 目的地:</Text>
            <Text style={[
              styles.locationText,
              !destinationAddress && styles.placeholderText
            ]}>
              {destinationAddress || 'タップして駅を選択'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Confirmation Number (when confirmed) */}
        {bookingStatus === 'confirmed' && (
          <View style={styles.confirmationBox}>
            <Text style={styles.confirmationLabel}>確認番号</Text>
            <Text style={styles.confirmationNumber}>{confirmationNumber}</Text>
            <Text style={styles.confirmationHint}>ドライバーにこの番号を見せてください</Text>
          </View>
        )}

        {/* Driver Info (when confirmed) */}
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
            <View style={styles.driverInfoRow}>
              <Text style={styles.driverInfoLabel}>ナンバー:</Text>
              <Text style={styles.driverInfoText}>{selectedDriver.plateNumber}</Text>
            </View>
            <View style={styles.driverInfoRow}>
              <Text style={styles.driverInfoLabel}>評価:</Text>
              <Text style={styles.driverInfoText}>⭐ {selectedDriver.rating}</Text>
            </View>
          </View>
        )}

        {/* Fare Display */}
        {destination && (
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
            <Text style={styles.fareBreakdown}>
              内訳: 運賃 + アプリ手数料¥100 (GOは¥500)
=======
          </View>
          <TouchableOpacity 
            style={styles.locationRow}
            onPress={() => setShowDestinationModal(true)}
          >
            <Text style={styles.locationLabel}>🟢 目的地:</Text>
            <Text style={[
              styles.locationText,
              !destinationAddress && styles.placeholderText
            ]}>
              {destinationAddress || 'タップして駅を選択'}
>>>>>>> origin/main
            </Text>
          </TouchableOpacity>
        </View>

        {bookingStatus === 'confirmed' && (
          <View style={styles.confirmationBox}>
            <Text style={styles.confirmationLabel}>確認番号</Text>
            <Text style={styles.confirmationNumber}>{confirmationNumber}</Text>
            <Text style={styles.confirmationHint}>ドライバーにこの番号を見せてください</Text>
          </View>
        )}

<<<<<<< HEAD
        {/* Nearby Drivers */}
=======
        {destination && (
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

>>>>>>> origin/main
        <View style={styles.driversBox}>
          <Text style={styles.driversTitle}>
            🚕 {nearbyDrivers.length}台が配車可能
          </Text>
<<<<<<< HEAD
          <View style={styles.driversRow}>
            {nearbyDrivers.map((driver, index) => (
              <View key={index} style={styles.driverItem}>
                <Text style={styles.driverItemIcon}>🚕</Text>
                <Text style={styles.driverItemText}>{driver.eta}分</Text>
                <Text style={styles.driverItemRating}>⭐{driver.rating}</Text>
              </View>
            ))}
=======
        </View>

        {bookingStatus === 'idle' && (
          <TouchableOpacity 
            style={[styles.bookButton, !destination && styles.bookButtonDisabled]}
            onPress={requestRide}
            disabled={!destination}
          >
            <Text style={styles.bookButtonText}>
              {destination ? '配車をリクエスト' : '目的地を選択してください'}
            </Text>
          </TouchableOpacity>
        )}

        {bookingStatus === 'searching' && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.searchingText}>ドライバーを探しています...</Text>
>>>>>>> origin/main
          </View>
        </View>

<<<<<<< HEAD
        {/* Action Buttons */}
        {bookingStatus === 'idle' && (
          <TouchableOpacity 
            style={[styles.bookButton, !destination && styles.bookButtonDisabled]}
            onPress={requestRide}
            disabled={!destination}
          >
            <Text style={styles.bookButtonText}>
              {destination ? '配車をリクエスト' : '目的地を選択してください'}
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

        {/* Train Sync Feature */}
        <TouchableOpacity style={styles.trainButton}>
          <Text style={styles.trainIcon}>🚆</Text>
          <Text style={styles.trainText}>電車の到着時刻と同期</Text>
          <Text style={styles.trainSubtext}>3分前に自動配車</Text>
        </TouchableOpacity>

        {/* Mode Switch */}
        <TouchableOpacity style={styles.switchButton} onPress={onSwitchMode}>
          <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
          <Text style={styles.backButtonText}>モード選択に戻る</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>全国47都道府県対応</Text>
          <Text style={styles.footerText}>24/7サポート • 隠れた料金なし</Text>
        </View>
      </ScrollView>

      {/* Station Selection Modal */}
=======
        <TouchableOpacity style={styles.switchButton} onPress={onSwitchMode}>
          <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
          <Text style={styles.backButtonText}>モード選択に戻る</Text>
        </TouchableOpacity>
      </ScrollView>

>>>>>>> origin/main
      <Modal
        visible={showDestinationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>目的地の駅を選択</Text>
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
              onPress={() => setShowDestinationModal(false)}
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
<<<<<<< HEAD
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    height: 300,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
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
  fareBreakdown: {
    fontSize: 11,
    color: '#999',
    marginTop: 10,
    fontStyle: 'italic',
  },
  driversBox: {
    backgroundColor: '#e7f3ff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  driversTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#0056b3',
  },
  driversRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
  // Modal styles
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
=======
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#667eea' },
  header: { padding: 20, alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  savingsBadge: { backgroundColor: '#28a745', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  savingsText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  mapContainer: { height: 300, margin: 15, borderRadius: 15, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e8f4fd' },
  mapIcon: { fontSize: 60, marginBottom: 10 },
  mapPlaceholderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  mapPlaceholderText: { fontSize: 14, color: '#666' },
  driversPreview: { flexDirection: 'row', marginTop: 20, gap: 15 },
  driverPreviewItem: { alignItems: 'center' },
  driverIcon: { fontSize: 30 },
  driverEta: { fontSize: 12, color: '#667eea', fontWeight: 'bold' },
  locationBox: { backgroundColor: 'white', margin: 15, padding: 15, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  locationLabel: { fontSize: 14, width: 80 },
  locationText: { flex: 1, fontSize: 14, color: '#333' },
  placeholderText: { color: '#999', fontStyle: 'italic' },
  confirmationBox: { backgroundColor: '#002060', margin: 15, padding: 25, borderRadius: 15, alignItems: 'center' },
  confirmationLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 10 },
  confirmationNumber: { color: 'white', fontSize: 48, fontWeight: 'bold', letterSpacing: 5 },
  confirmationHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 10 },
  fareBox: { backgroundColor: 'white', margin: 15, padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  fareLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1a1a1a' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fareText: { fontSize: 14, color: '#6c757d' },
  fareAmount: { fontSize: 24, fontWeight: 'bold', color: '#28a745' },
  fareNote: { fontSize: 12, color: '#ffc107', marginTop: 10 },
  savingsInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  savingsLabel: { fontSize: 14, color: '#28a745', fontWeight: 'bold' },
  savingsValue: { fontSize: 14, color: '#28a745', fontWeight: 'bold' },
  driversBox: { backgroundColor: '#e7f3ff', margin: 15, padding: 15, borderRadius: 10 },
  driversTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#0056b3' },
  bookButton: { backgroundColor: '#28a745', margin: 15, padding: 18, borderRadius: 25, alignItems: 'center' },
  bookButtonDisabled: { backgroundColor: '#ccc' },
  bookButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  searchingContainer: { margin: 15, padding: 20, alignItems: 'center' },
  searchingText: { marginTop: 10, fontSize: 16, color: '#667eea' },
  switchButton: { backgroundColor: '#ff6b6b', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 25, alignItems: 'center' },
  switchButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  backButton: { backgroundColor: '#6c757d', marginHorizontal: 15, marginBottom: 30, padding: 15, borderRadius: 25, alignItems: 'center' },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#1a1a1a' },
  stationList: { maxHeight: 400 },
  stationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stationInfo: { flex: 1 },
  stationName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  stationDistrict: { fontSize: 12, color: '#666', marginTop: 2 },
  stationArrow: { fontSize: 20, color: '#667eea' },
  modalCloseButton: { backgroundColor: '#6c757d', padding: 15, borderRadius: 25, alignItems: 'center', marginTop: 20 },
  modalCloseText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
>>>>>>> origin/main
});

export default CustomerScreen;