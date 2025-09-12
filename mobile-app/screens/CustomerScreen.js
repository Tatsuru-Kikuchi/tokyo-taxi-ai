import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import allStationsData from '../data/all_japan_stations.json';

const { width, height } = Dimensions.get('window');
const isIPad = Platform.OS === 'ios' && Platform.isPad;

export default function CustomerScreen({
  location,
  backendStatus,
  onModeSwitch,
  onBackToSelection,
  backendUrl,
  geocodingService
}) {
  // Core state
  const [selectedStation, setSelectedStation] = useState(null);
  const [destination, setDestination] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [savedDestinations, setSavedDestinations] = useState([]);
  const [frequentDestinations, setFrequentDestinations] = useState([]);
  const [fare, setFare] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);

  // Modal states
  const [showStationModal, setShowStationModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Search and input states
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [destinationSearchQuery, setDestinationSearchQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Data and calculation states
  const [stations, setStations] = useState([]);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [weatherSurge, setWeatherSurge] = useState(0);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);
  const [routeData, setRouteData] = useState(null);

  useEffect(() => {
    initializeData();
    fetchNearbyDrivers();
    checkWeatherSurge();

    const interval = setInterval(() => {
      fetchNearbyDrivers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location && stations.length > 0) {
      filterNearbyStations();
    }
  }, [location, stations]);

  useEffect(() => {
    if (selectedStation && destination) {
      calculateEnhancedFare();
    }
  }, [selectedStation, destination, weatherSurge]);

  const initializeData = async () => {
    try {
      setStations(allStationsData || []);

      const saved = await AsyncStorage.getItem('savedDestinations');
      if (saved) {
        const destinations = JSON.parse(saved);
        setSavedDestinations(destinations || []);

        const frequent = destinations
          .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
          .slice(0, 3);
        setFrequentDestinations(frequent);
      }
    } catch (error) {
      console.log('Data initialization error:', error);
    }
  };

  // Filter stations within 10km of current location
  const filterNearbyStations = () => {
    if (!location || !stations.length) return;

    const nearby = stations.filter(station => {
      if (!station.lat || !station.lng) return false;

      const distance = calculateDistance(
        location.latitude, location.longitude,
        parseFloat(station.lat), parseFloat(station.lng)
      );

      return distance <= 10; // Within 10km
    });

    // Sort by distance
    nearby.sort((a, b) => {
      const distA = calculateDistance(
        location.latitude, location.longitude,
        parseFloat(a.lat), parseFloat(a.lng)
      );
      const distB = calculateDistance(
        location.latitude, location.longitude,
        parseFloat(b.lat), parseFloat(b.lng)
      );
      return distA - distB;
    });

    setNearbyStations(nearby.slice(0, 50)); // Limit to 50 nearest stations
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchNearbyDrivers = async () => {
    try {
      if (!location || backendStatus !== 'online') {
        setNearbyDrivers([
          { id: 1, name: '田中', distance: 0.8, rating: 4.9, eta: 3 },
          { id: 2, name: '佐藤', distance: 1.2, rating: 4.8, eta: 5 },
          { id: 3, name: '鈴木', distance: 1.5, rating: 4.7, eta: 7 },
        ]);
        return;
      }

      const response = await fetch(
        `${backendUrl}/api/drivers/nearby?lat=${location.latitude}&lng=${location.longitude}`,
        { timeout: 5000 }
      );

      if (response.ok) {
        const drivers = await response.json();
        setNearbyDrivers(drivers || []);
      }
    } catch (error) {
      console.log('Failed to fetch drivers:', error);
    }
  };

  const checkWeatherSurge = async () => {
    try {
      if (!location) return;

      const weatherKey = 'bd17578f85cb46d681ca3e4f3bdc9963';
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${weatherKey}&units=metric`
      );

      if (response.ok) {
        const weather = await response.json();
        const condition = weather.weather[0].main.toLowerCase();

        if (condition.includes('rain') || condition.includes('storm')) {
          const intensity = weather.weather[0].description;
          setWeatherSurge(intensity.includes('heavy') ? 30 : 15);
        } else {
          setWeatherSurge(0);
        }
      }
    } catch (error) {
      console.log('Weather check error:', error);
      setWeatherSurge(0);
    }
  };

  const calculateEnhancedFare = async () => {
    if (!selectedStation || !destination || !geocodingService) return;

    setIsCalculatingFare(true);

    try {
      const fareResult = await geocodingService.calculateRealisticFare(
        selectedStation.name,
        destination
      );

      if (fareResult) {
        let finalFare = fareResult.fare;

        // Apply weather surge
        if (weatherSurge > 0) {
          finalFare *= (1 + weatherSurge / 100);
        }

        // Apply night surcharge
        const currentHour = new Date().getHours();
        if (currentHour >= 22 || currentHour < 5) {
          finalFare *= 1.2;
        }

        finalFare = Math.round(finalFare / 10) * 10;

        setFare({
          amount: finalFare,
          distance: fareResult.distance,
          duration: fareResult.duration,
          surge: weatherSurge,
          goSavings: Math.round(finalFare * 0.15),
          breakdown: fareResult.breakdown,
          isRealDistance: fareResult.isRealDistance,
          source: fareResult.source,
        });

        setRouteData(fareResult.route);
      } else {
        calculateFallbackFare();
      }
    } catch (error) {
      console.log('Enhanced fare calculation failed:', error);
      calculateFallbackFare();
    } finally {
      setIsCalculatingFare(false);
    }
  };

  const calculateFallbackFare = () => {
    const baseFare = 500;
    let estimatedDistance = 2.5;

    const destinationStr = destination?.toString() || '';

    if (destinationStr.includes('羽田空港') || destinationStr.includes('成田空港')) {
      estimatedDistance = destinationStr.includes('羽田') ? 22 : 65;
    } else if (destinationStr.length < 30 && !destinationStr.includes('県')) {
      estimatedDistance = 2 + Math.random() * 3;
    }

    let totalFare = baseFare + (estimatedDistance * 200);

    if (weatherSurge > 0) {
      totalFare *= (1 + weatherSurge / 100);
    }

    const currentHour = new Date().getHours();
    if (currentHour >= 22 || currentHour < 5) {
      totalFare *= 1.2;
    }

    totalFare = Math.max(Math.round(totalFare / 10) * 10, 500);

    setFare({
      amount: totalFare,
      distance: estimatedDistance,
      surge: weatherSurge,
      goSavings: Math.round(totalFare * 0.15),
      isRealDistance: false,
      source: 'fallback'
    });
  };

  const handleDestinationInput = async (text) => {
    setCustomDestination(text);

    if (text.length >= 3 && geocodingService) {
      try {
        const suggestions = await geocodingService.getAddressSuggestions(text);
        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.log('Suggestion error:', error);
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setDestination(suggestion.address);
    setCustomDestination('');
    setShowSuggestions(false);
  };

  const saveDestination = async (dest) => {
    try {
      const existing = savedDestinations.find(d => d.address === dest);
      let updatedDestinations;

      if (existing) {
        updatedDestinations = savedDestinations.map(d =>
          d.address === dest ? { ...d, frequency: (d.frequency || 1) + 1 } : d
        );
      } else {
        updatedDestinations = [...savedDestinations, {
          address: dest,
          frequency: 1,
          savedAt: new Date().toISOString()
        }];
      }

      setSavedDestinations(updatedDestinations);
      await AsyncStorage.setItem('savedDestinations', JSON.stringify(updatedDestinations));

      const frequent = updatedDestinations
        .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
        .slice(0, 3);
      setFrequentDestinations(frequent);
    } catch (error) {
      console.log('Save destination error:', error);
    }
  };

  const handleBookTaxi = async () => {
    try {
      if (!selectedStation || !destination) {
        Alert.alert('エラー', '出発地と目的地を選択してください。');
        return;
      }

      setIsLoading(true);
      const confNum = 'TX' + Date.now().toString().slice(-6);
      setConfirmationNumber(confNum);
      await saveDestination(destination);

      if (backendStatus === 'online') {
        try {
          const response = await fetch(`${backendUrl}/api/bookings/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              confirmationNumber: confNum,
              pickup: { station: selectedStation.name, location: location },
              destination: destination,
              fare: fare?.amount,
              timestamp: new Date().toISOString(),
            }),
          });

          if (!response.ok) {
            throw new Error('Booking request failed');
          }
        } catch (error) {
          console.log('Backend booking error:', error);
        }
      }

      setShowConfirmModal(true);
    } catch (error) {
      console.log('Booking error:', error);
      Alert.alert('エラー', 'タクシーの手配に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInteractiveMapHTML = () => {
    if (!selectedStation || !destination) return '';

    const pickupCoords = selectedStation.lng && selectedStation.lat ?
      [parseFloat(selectedStation.lng), parseFloat(selectedStation.lat)] :
      [137.043394, 35.264311];

    const destCoords = [137.023075, 35.2554861];

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .route-info {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          text-align: center;
          margin-bottom: 20px;
        }
        .route-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .route-stats { display: flex; justify-content: space-around; margin: 15px 0; }
        .route-stat { text-align: center; }
        .route-stat-value { font-size: 24px; font-weight: bold; color: #FF6B35; margin-bottom: 5px; }
        .route-stat-label { font-size: 14px; color: #666; }
        .fare-info { background: #4CAF50; margin-top: 15px; padding: 15px; border-radius: 8px; font-weight: bold; color: white; font-size: 18px; }
        .fare-breakdown { font-size: 14px; margin-top: 8px; opacity: 0.9; }
        .map-placeholder {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          height: 300px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="route-info">
        <div class="route-title">📍 ${selectedStation.name} → ${destination}</div>
        <div class="route-stats">
          <div class="route-stat">
            <div class="route-stat-value">${fare?.distance || 'N/A'}km</div>
            <div class="route-stat-label">距離</div>
          </div>
          <div class="route-stat">
            <div class="route-stat-value">${fare?.duration || 'N/A'}分</div>
            <div class="route-stat-label">所要時間</div>
          </div>
        </div>
        ${fare ? `
        <div class="fare-info">
          <div>予想料金: ¥${fare.amount.toLocaleString()}</div>
          <div class="fare-breakdown">
            ${fare.source === 'mapbox' ? '実測距離ベース' : '推定距離ベース'} •
            GOより¥${fare.goSavings.toLocaleString()}お得
          </div>
        </div>
        ` : ''}
      </div>
      <div class="map-placeholder">
        🗺️ インタラクティブマップ<br>
        (Mapbox統合予定)
      </div>
    </body>
    </html>
    `;
  };

  const filteredNearbyStations = nearbyStations.filter(station =>
    station?.name?.toLowerCase().includes(stationSearchQuery.toLowerCase()) ||
    station?.name_kana?.toLowerCase().includes(stationSearchQuery.toLowerCase())
  );

  const filteredDestinations = savedDestinations.filter(dest =>
    dest?.address?.toLowerCase().includes(destinationSearchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGradient} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚕 全国AIタクシー</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.modeButton}
              onPress={() => onModeSwitch('driver')}
            >
              <Text style={styles.modeButtonText}>ドライバーモード</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackToSelection}
            >
              <Text style={styles.backButtonText}>← モード選択</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Display */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapTitle}>📍 現在地とドライバー</Text>
            <Text style={styles.locationText}>
              位置: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : '取得中...'}
            </Text>
            <Text style={styles.statusText}>
              バックエンド: {backendStatus === 'online' ? '🟢 オンライン' : '🔴 オフライン'}
            </Text>
            <Text style={styles.statusText}>
              地図サービス: {geocodingService?.mapboxAvailable ? '🗺️ Mapbox統合' : '📍 座標計算'}
            </Text>

            <View style={styles.driversContainer}>
              <Text style={styles.driversTitle}>近くのドライバー ({nearbyDrivers.length}台)</Text>
              {nearbyDrivers.map((driver, index) => (
                <View key={driver.id || index} style={styles.driverItem}>
                  <Text style={styles.driverText}>
                    🚗 {driver.name} - {driver.distance}km (⭐{driver.rating}) - {driver.eta}分
                  </Text>
                </View>
              ))}
            </View>

            {selectedStation && destination && (
              <TouchableOpacity
                style={styles.routeButton}
                onPress={() => setShowMapModal(true)}
              >
                <Text style={styles.routeButtonText}>🗺️ インタラクティブマップを表示</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Station Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🚇 出発駅</Text>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => setShowStationModal(true)}
          >
            <Text style={[
              styles.selectionText,
              selectedStation ? styles.selectedText : styles.placeholderText
            ]}>
              {selectedStation?.name || '駅を選択してください'}
            </Text>
          </TouchableOpacity>

          {selectedStation && (
            <View style={styles.stationInfo}>
              <Text style={styles.stationDetail}>📍 {selectedStation.prefecture}</Text>
              {location && selectedStation.lat && selectedStation.lng && (
                <Text style={styles.stationDistance}>
                  距離: {calculateDistance(
                    location.latitude, location.longitude,
                    parseFloat(selectedStation.lat), parseFloat(selectedStation.lng)
                  ).toFixed(1)}km
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Frequent Destinations */}
        {frequentDestinations.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>⭐ よく使う目的地</Text>
            <View style={styles.frequentContainer}>
              {frequentDestinations.map((dest, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.frequentButton}
                  onPress={() => setDestination(dest.address)}
                >
                  <Text style={styles.frequentText}>{dest.address}</Text>
                  <Text style={styles.frequentCount}>({dest.frequency}回)</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Destination Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>📍 目的地</Text>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => setShowDestinationModal(true)}
          >
            <Text style={[
              styles.selectionText,
              destination ? styles.selectedText : styles.placeholderText
            ]}>
              {destination || '目的地を入力または選択'}
            </Text>
          </TouchableOpacity>

          {/* Address Input */}
          <View style={styles.addressInputContainer}>
            <Text style={styles.customInputLabel}>住所を入力:</Text>
            <TextInput
              style={styles.customInput}
              value={customDestination}
              onChangeText={handleDestinationInput}
              placeholder="例: 愛知県春日井市○○町1-2-3"
              placeholderTextColor="#999"
              onSubmitEditing={() => {
                if (customDestination.trim()) {
                  setDestination(customDestination.trim());
                  setCustomDestination('');
                  setShowSuggestions(false);
                }
              }}
            />

            {showSuggestions && (
              <View style={styles.suggestionsContainer}>
                {addressSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion.address}</Text>
                    <Text style={styles.suggestionSource}>
                      {suggestion.source === 'mapbox' ? '📍 Mapbox' : '📋 候補'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Fare Display */}
        {fare && (
          <View style={styles.fareContainer}>
            <View style={styles.fareHeader}>
              <Text style={styles.fareTitle}>
                💰 料金見積もり ({fare.source === 'mapbox' ? 'Mapbox実測' : '推定'})
              </Text>
            </View>

            {isCalculatingFare ? (
              <View style={styles.calculatingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.calculatingText}>正確な料金を計算中...</Text>
              </View>
            ) : (
              <View style={styles.fareDetails}>
                <Text style={styles.fareAmount}>¥{fare.amount.toLocaleString()}</Text>
                <View style={styles.fareStatsRow}>
                  <View style={styles.fareStat}>
                    <Text style={styles.fareStatValue}>{fare.distance}km</Text>
                    <Text style={styles.fareStatLabel}>距離</Text>
                  </View>
                  {fare.duration && (
                    <View style={styles.fareStat}>
                      <Text style={styles.fareStatValue}>{fare.duration}分</Text>
                      <Text style={styles.fareStatLabel}>所要時間</Text>
                    </View>
                  )}
                </View>

                {fare.surge > 0 && (
                  <View style={styles.surgeBadge}>
                    <Text style={styles.surgeText}>天候割増 +{fare.surge}%</Text>
                  </View>
                )}

                <View style={styles.goComparisonContainer}>
                  <Text style={styles.goComparison}>
                    🎉 GOより¥{fare.goSavings.toLocaleString()}お得！
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Book Button */}
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedStation || !destination || isLoading) && styles.bookButtonDisabled
          ]}
          onPress={handleBookTaxi}
          disabled={!selectedStation || !destination || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.bookButtonText}>🚕 タクシーを呼ぶ</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Station Selection Modal */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>近くの駅を選択 ({nearbyStations.length}駅)</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowStationModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            value={stationSearchQuery}
            onChangeText={setStationSearchQuery}
            placeholder="駅名で検索..."
            placeholderTextColor="#999"
          />

          <FlatList
            data={filteredNearbyStations}
            keyExtractor={(item, index) => `${item.odpt_id || item.name}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.stationItem}
                onPress={() => {
                  setSelectedStation(item);
                  setShowStationModal(false);
                  setStationSearchQuery('');
                }}
              >
                <View style={styles.stationItemContent}>
                  <Text style={styles.stationName}>{item.name}</Text>
                  <Text style={styles.stationDetail}>{item.prefecture}</Text>
                </View>
                {location && item.lat && item.lng && (
                  <Text style={styles.stationItemDistance}>
                    {calculateDistance(
                      location.latitude, location.longitude,
                      parseFloat(item.lat), parseFloat(item.lng)
                    ).toFixed(1)}km
                  </Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>近くの駅が見つかりません</Text>
                <Text style={styles.emptySubtext}>検索条件を変更してください</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Interactive Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity
              style={styles.mapModalCloseButton}
              onPress={() => setShowMapModal(false)}
            >
              <Text style={styles.mapModalCloseText}>✕ 閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>インタラクティブマップ</Text>
            <View style={styles.mapModalSpacer} />
          </View>

          <WebView
            source={{ html: generateInteractiveMapHTML() }}
            style={styles.webViewMap}
            scrollEnabled={false}
            bounces={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent);
            }}
            onLoadStart={() => console.log('WebView started loading')}
            onLoadEnd={() => console.log('WebView finished loading')}
          />
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmTitle}>🎉 予約完了</Text>
            <Text style={styles.confirmNumber}>予約番号: {confirmationNumber}</Text>
            <View style={styles.confirmDetails}>
              <Text style={styles.confirmDetail}>出発: {selectedStation?.name}</Text>
              <Text style={styles.confirmDetail}>目的地: {destination}</Text>
              <Text style={styles.confirmDetail}>料金: ¥{fare?.amount?.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                setShowConfirmModal(false);
                // Reset form
                setSelectedStation(null);
                setDestination('');
                setFare(null);
              }}
            >
              <Text style={styles.confirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#667eea',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: isIPad ? 28 : 24,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  modeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#666666',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    height: isIPad ? 300 : 220,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mapPlaceholder: {
    flex: 1,
    padding: 20,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
  },
  locationText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  driversContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  driversTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333333',
  },
  driverItem: {
    paddingVertical: 6,
  },
  driverText: {
    fontSize: 14,
    color: '#555555',
  },
  routeVisualization: {
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  routeHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  routeDetails: {
    alignItems: 'center',
    marginBottom: 15,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  routePointIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  routePointText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  routeLine: {
    alignItems: 'center',
    marginVertical: 5,
  },
  routeArrow: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  routeDistance: {
    fontSize: 12,
    color: '#666666',
    marginVertical: 2,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  routeStat: {
    alignItems: 'center',
  },
  routeStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  routeStatLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  viewRouteButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 15,
    alignSelf: 'center',
  },
  viewRouteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  routeButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 15,
    alignSelf: 'center',
    elevation: 4,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  routeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
  },
  selectionButton: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#fafafa',
  },
  selectionText: {
    fontSize: 16,
  },
  selectedText: {
    color: '#333333',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#999999',
  },
  stationInfo: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
  },
  stationDetail: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 4,
  },
  stationDistance: {
    fontSize: 14,
    color: '#666666',
  },
  frequentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  frequentButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  frequentText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
  },
  frequentCount: {
    color: '#1976d2',
    fontSize: 12,
    marginLeft: 6,
    opacity: 0.8,
  },
  addressInputContainer: {
    position: 'relative',
  },
  customInputLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 15,
    marginBottom: 8,
    fontWeight: '500',
  },
  customInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  suggestionSource: {
    fontSize: 12,
    color: '#666666',
  },
  fareContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fareHeader: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  fareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
  },
  calculatingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  calculatingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  fareDetails: {
    padding: 20,
    alignItems: 'center',
  },
  fareAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
  },
  fareStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 15,
  },
  fareStat: {
    alignItems: 'center',
  },
  fareStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  fareStatLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  surgeBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  surgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  goComparisonContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  goComparison: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginTop: 25,
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#cccccc',
    shadowColor: '#cccccc',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
  },
  searchInput: {
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  stationItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationItemContent: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  stationItemDistance: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  mapModalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mapModalCloseText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  mapModalSpacer: {
    width: 80,
  },
  webViewMap: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    width: width * 0.9,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
  },
  confirmNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmDetails: {
    width: '100%',
    marginBottom: 25,
  },
  confirmDetail: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
