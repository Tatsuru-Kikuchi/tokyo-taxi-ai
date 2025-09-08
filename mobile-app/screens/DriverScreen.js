import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  SafeAreaView,
  Switch,
  Platform,
  FlatList,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import allStationsData from '../data/all_japan_stations.json';
import TrainService from '../services/TrainService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const STATION_DATA = allStationsData;

export default function DriverScreen({ onModeChange, onBack, pushToken }) {
  const [isOnline, setIsOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [showRideModal, setShowRideModal] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 28500,
    week: 142000,
    month: 580000,
    hours: 8,
    rides: 23,
    cashEarnings: 15000,
    cardEarnings: 13500,
    surgeEarnings: 4500  // New: earnings from surge pricing
  });
  const [location, setLocation] = useState(null);
  const [autoAccept, setAutoAccept] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showStationModal, setShowStationModal] = useState(false);
  const [driverStats, setDriverStats] = useState({
    rating: 4.9,
    completionRate: 98,
    totalRides: 1847,
    acceptanceRate: 92
  });
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [filteredStations, setFilteredStations] = useState([]);
  const [showDemandMap, setShowDemandMap] = useState(false);

  // New states for train integration
  const [delayAlerts, setDelayAlerts] = useState([]);
  const [showDelayAlerts, setShowDelayAlerts] = useState(true);
  const [priorityMode, setPriorityMode] = useState(false);
  const [nearbyDelayedStations, setNearbyDelayedStations] = useState([]);
  const [monitoringStations, setMonitoringStations] = useState([]);
  const [loadingDelays, setLoadingDelays] = useState(false);

  const hotspots = [
    { name: '六本木', demand: '高', time: '22:00-02:00', lat: 35.6641, lng: 139.7294, surge: 1.2 },
    { name: '新橋', demand: '中', time: '18:00-21:00', lat: 35.6657, lng: 139.7516, surge: 1.1 },
    { name: '羽田空港', demand: '高', time: '06:00-09:00', lat: 35.5494, lng: 139.7798, surge: 1.15 },
  ];

  useEffect(() => {
    requestLocationPermission();
    if (isOnline) {
      simulateRideRequests();
      updateLocationToBackend();
      checkNearbyStationDelays();
    }
  }, [isOnline]);

  useEffect(() => {
    if (location && STATION_DATA.length > 0) {
      loadNearbyStations();
    }
  }, [location]);

  useEffect(() => {
    // Check for delays every 2 minutes when online
    const interval = setInterval(() => {
      if (isOnline) {
        checkNearbyStationDelays();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [isOnline, location]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const locationData = await Location.getCurrentPositionAsync({});
        setLocation(locationData.coords);
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const updateLocationToBackend = async () => {
    if (!location || !isOnline) return;

    try {
      await fetch(`${BACKEND_URL}/api/drivers/d1/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          priorityMode: priorityMode
        })
      });
    } catch (error) {
      console.log('Failed to update location:', error);
    }
  };

  const loadNearbyStations = () => {
    if (!location || !STATION_DATA) return;

    const nearby = STATION_DATA
      .map(station => ({
        ...station,
        distance: Math.sqrt(
          Math.pow(station.lat - location.latitude, 2) +
          Math.pow(station.lng - location.longitude, 2)
        ) * 111000
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    setFilteredStations(nearby);
  };

  const checkNearbyStationDelays = async () => {
    if (!location || !isOnline) return;

    setLoadingDelays(true);
    const delayedStations = [];

    try {
      // Get 5 nearest stations
      const nearestStations = STATION_DATA
        .map(station => ({
          ...station,
          distance: Math.sqrt(
            Math.pow(station.lat - location.latitude, 2) +
            Math.pow(station.lng - location.longitude, 2)
          ) * 111000
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      // Check delays for each station
      for (const station of nearestStations) {
        const lines = await TrainService.getStationLines(station.name);
        const delayStatus = await TrainService.checkDelays(station.name, lines.map(l => l.id));

        if (delayStatus.hasDelays) {
          delayedStations.push({
            station: station,
            delays: delayStatus,
            distance: station.distance,
            estimatedDemand: this.calculateDemandFromDelay(delayStatus.maxDelay)
          });
        }
      }

      setNearbyDelayedStations(delayedStations);

      // Create alerts for significant delays
      const newAlerts = delayedStations
        .filter(ds => ds.delays.maxDelay >= 20)
        .map(ds => ({
          id: Date.now() + Math.random(),
          stationName: ds.station.name,
          delayMinutes: ds.delays.maxDelay,
          distance: ds.distance,
          timestamp: new Date(),
          read: false
        }));

      if (newAlerts.length > 0) {
        setDelayAlerts(prev => [...newAlerts, ...prev].slice(0, 10));

        // Notify driver of high-demand opportunity
        if (showDelayAlerts && newAlerts[0].delayMinutes >= 30) {
          Alert.alert(
            '🚨 高需要アラート',
            `${newAlerts[0].stationName}で${newAlerts[0].delayMinutes}分の遅延発生！\n需要急増が予想されます。`,
            [
              { text: '後で', style: 'cancel' },
              {
                text: '駅へ向かう',
                onPress: () => navigateToStation(delayedStations[0].station)
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error checking station delays:', error);
    } finally {
      setLoadingDelays(false);
    }
  };

  const calculateDemandFromDelay = (delayMinutes) => {
    if (delayMinutes >= 30) return 'とても高い';
    if (delayMinutes >= 20) return '高い';
    if (delayMinutes >= 10) return '中';
    return '低';
  };

  const navigateToStation = (station) => {
    setSelectedStation(station);
    Alert.alert(
      '案内開始',
      `${station.name}への案内を開始します。\n距離: ${(station.distance / 1000).toFixed(1)}km`,
      [{ text: 'OK' }]
    );
  };

  const searchStations = (query) => {
    setStationSearchQuery(query);

    if (query.length === 0) {
      loadNearbyStations();
      return;
    }

    const filtered = STATION_DATA
      .filter(station =>
        station.name?.includes(query) ||
        station.nameEn?.toLowerCase().includes(query.toLowerCase()) ||
        station.prefecture?.includes(query)
      )
      .slice(0, 50);

    setFilteredStations(filtered);
  };

  const simulateRideRequests = () => {
    const interval = setInterval(() => {
      if (isOnline && !currentRide && Math.random() > 0.7) {
        const nearbyStation = filteredStations[0] || { name: '東京駅' };
        const destinations = ['六本木', '渋谷', '新宿', '品川', '銀座'];

        // Higher chance of rides from delayed stations
        const isDelayRelated = nearbyDelayedStations.length > 0 && Math.random() > 0.5;
        const pickupStation = isDelayRelated ?
          nearbyDelayedStations[0].station : nearbyStation;

        // Calculate surge based on delays
        let surgeFare = 1.0;
        if (isDelayRelated && nearbyDelayedStations[0].delays.maxDelay >= 30) {
          surgeFare = 1.3;
        } else if (isDelayRelated && nearbyDelayedStations[0].delays.maxDelay >= 20) {
          surgeFare = 1.2;
        }

        const baseFare = Math.floor(Math.random() * 3000 + 1500);
        const mockRide = {
          id: Date.now(),
          bookingId: `BK${Date.now()}`,
          pickup: pickupStation.name,
          dropoff: destinations[Math.floor(Math.random() * destinations.length)],
          distance: `${(Math.random() * 10 + 2).toFixed(1)}km`,
          fare: Math.floor(baseFare * surgeFare),
          baseFare: baseFare,
          surgeMultiplier: surgeFare,
          customerName: '山田様',
          estimatedTime: Math.floor(Math.random() * 20 + 10),
          isDelayRelated: isDelayRelated,
          delayInfo: isDelayRelated ? `${nearbyDelayedStations[0].delays.maxDelay}分遅延` : null
        };

        if (autoAccept || (priorityMode && isDelayRelated)) {
          acceptRide(mockRide);
        } else {
          setCurrentRide(mockRide);
          setShowRideModal(true);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  };

  const acceptRide = (ride) => {
    setCurrentRide(ride);
    setShowRideModal(false);

    const message = ride.isDelayRelated ?
      `遅延関連配車\n${ride.pickup}から${ride.dropoff}への配車を受け付けました\nサージ料金: ${Math.round((ride.surgeMultiplier - 1) * 100)}%増` :
      `${ride.pickup}から${ride.dropoff}への配車を受け付けました`;

    Alert.alert('配車確定', message);
  };

  const declineRide = () => {
    setCurrentRide(null);
    setShowRideModal(false);
  };

  const completeRide = async () => {
    if (!currentRide) return;

    const surgeEarning = currentRide.fare - currentRide.baseFare;

    setEarnings(prev => ({
      ...prev,
      today: prev.today + currentRide.fare,
      rides: prev.rides + 1,
      cashEarnings: prev.cashEarnings + currentRide.baseFare,
      surgeEarnings: prev.surgeEarnings + surgeEarning
    }));

    Alert.alert(
      '運行完了',
      `¥${currentRide.fare}を獲得しました${surgeEarning > 0 ? `\n(サージ料金: +¥${surgeEarning})` : ''}`
    );

    setCurrentRide(null);
  };

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      Alert.alert('オンライン', '配車リクエストの受付を開始しました');
      checkNearbyStationDelays(); // Check delays immediately when going online
    } else {
      Alert.alert('オフライン', '配車リクエストの受付を停止しました');
    }
  };

  const renderDelayAlerts = () => {
    if (delayAlerts.length === 0) return null;

    return (
      <View style={styles.alertsContainer}>
        <View style={styles.alertsHeader}>
          <Ionicons name="warning" size={20} color="#FF6347" />
          <Text style={styles.alertsTitle}>遅延アラート</Text>
          <Switch
            value={showDelayAlerts}
            onValueChange={setShowDelayAlerts}
            trackColor={{ false: '#767577', true: '#FF6347' }}
            thumbColor="#ffffff"
            style={styles.alertToggle}
          />
        </View>

        {delayAlerts.slice(0, 3).map((alert, index) => (
          <TouchableOpacity
            key={alert.id}
            style={[styles.alertItem, !alert.read && styles.unreadAlert]}
            onPress={() => {
              const station = STATION_DATA.find(s => s.name === alert.stationName);
              if (station) navigateToStation(station);

              // Mark as read
              setDelayAlerts(prev =>
                prev.map(a => a.id === alert.id ? {...a, read: true} : a)
              );
            }}
          >
            <View style={styles.alertContent}>
              <Text style={styles.alertStation}>{alert.stationName}</Text>
              <Text style={styles.alertDelay}>{alert.delayMinutes}分遅延</Text>
            </View>
            <View style={styles.alertMeta}>
              <Text style={styles.alertDistance}>
                {alert.distance < 1000 ?
                  `${Math.round(alert.distance)}m` :
                  `${(alert.distance / 1000).toFixed(1)}km`}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDemandVisualization = () => (
    <View style={styles.demandContainer}>
      <View style={styles.demandHeader}>
        <Ionicons name="flame" size={24} color="#ff6b6b" />
        <Text style={styles.demandTitle}>AI需要予測エリア</Text>
        {loadingDelays && <ActivityIndicator size="small" color="#ff6b6b" />}
      </View>

      {nearbyDelayedStations.length > 0 && (
        <View style={styles.delayedStationsSection}>
          <Text style={styles.delayedStationsTitle}>🚨 遅延発生駅（高需要）</Text>
          {nearbyDelayedStations.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.delayedStationCard}
              onPress={() => navigateToStation(item.station)}
            >
              <View style={styles.delayedStationInfo}>
                <Text style={styles.delayedStationName}>{item.station.name}</Text>
                <Text style={styles.delayedStationDelay}>
                  {item.delays.maxDelay}分遅延 • {item.estimatedDemand}需要
                </Text>
              </View>
              <View style={styles.delayedStationMeta}>
                <Text style={styles.surgeIndicator}>
                  {item.delays.maxDelay >= 30 ? '+30%' : '+20%'}
                </Text>
                <Text style={styles.distanceText}>
                  {(item.distance / 1000).toFixed(1)}km
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.demandGrid}>
        {hotspots.map((spot, index) => (
          <View key={index} style={styles.demandCard}>
            <View style={styles.demandCardHeader}>
              <Text style={styles.demandEmoji}>
                {spot.demand === '高' ? '🔴' : '🟡'}
              </Text>
              <Text style={styles.demandLevel}>需要: {spot.demand}</Text>
            </View>
            <Text style={styles.demandLocation}>{spot.name}</Text>
            <Text style={styles.demandTime}>{spot.time}</Text>
            <View style={styles.demandStats}>
              <Text style={styles.demandStatText}>
                予想収益: ¥{spot.demand === '高' ? '4,500/時' : '3,200/時'}
              </Text>
              {spot.surge > 1 && (
                <Text style={styles.surgeBadge}>+{Math.round((spot.surge - 1) * 100)}%</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onBack && onBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ドライバーモード</Text>
        <View style={styles.onlineToggle}>
          <Text style={styles.onlineText}>{isOnline ? 'オンライン' : 'オフライン'}</Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={isOnline ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {renderDelayAlerts()}

        <TouchableOpacity
          style={styles.mapToggleCard}
          onPress={() => setShowDemandMap(!showDemandMap)}
        >
          <View style={styles.mapToggleHeader}>
            <Ionicons name="map" size={24} color="#ff6b6b" />
            <Text style={styles.mapToggleTitle}>AI需要予測マップ</Text>
            <Ionicons name={showDemandMap ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {showDemandMap && renderDemandVisualization()}

        <View style={styles.earningsCard}>
          <Text style={styles.cardTitle}>本日の収益</Text>
          <Text style={styles.earningsAmount}>¥{earnings.today.toLocaleString()}</Text>

          <View style={styles.earningsBreakdown}>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>基本料金</Text>
              <Text style={styles.earningValue}>¥{(earnings.today - earnings.surgeEarnings).toLocaleString()}</Text>
            </View>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>サージ料金</Text>
              <Text style={styles.earningValueSurge}>+¥{earnings.surgeEarnings.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnings.rides}</Text>
              <Text style={styles.statLabel}>配車</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>¥{Math.round(earnings.today / earnings.hours)}</Text>
              <Text style={styles.statLabel}>時給</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnings.hours}h</Text>
              <Text style={styles.statLabel}>稼働時間</Text>
            </View>
          </View>
        </View>

        {currentRide && (
          <View style={[styles.currentRideCard, currentRide.isDelayRelated && styles.priorityRideCard]}>
            {currentRide.isDelayRelated && (
              <View style={styles.priorityBadge}>
                <Ionicons name="warning" size={16} color="white" />
                <Text style={styles.priorityBadgeText}>遅延関連 {currentRide.delayInfo}</Text>
              </View>
            )}
            <Text style={styles.cardTitle}>現在の配車</Text>
            <View style={styles.rideInfo}>
              <View style={styles.rideRow}>
                <Ionicons name="location" size={20} color="#4CAF50" />
                <Text style={styles.rideText}>乗車: {currentRide.pickup}</Text>
              </View>
              <View style={styles.rideRow}>
                <Ionicons name="flag" size={20} color="#FF6347" />
                <Text style={styles.rideText}>降車: {currentRide.dropoff}</Text>
              </View>
              <View style={styles.rideRow}>
                <Ionicons name="cash" size={20} color="#FFD700" />
                <Text style={styles.rideText}>
                  料金: ¥{currentRide.fare}
                  {currentRide.surgeMultiplier > 1 && (
                    <Text style={styles.surgeText}> (サージ +{Math.round((currentRide.surgeMultiplier - 1) * 100)}%)</Text>
                  )}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.completeButton} onPress={completeRide}>
              <Text style={styles.completeButtonText}>運行完了</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>自動受付</Text>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
            />
          </View>
          <Text style={styles.settingDescription}>
            配車リクエストを自動的に受け付けます
          </Text>

          <View style={[styles.settingRow, styles.settingRowBorder]}>
            <Text style={styles.settingLabel}>遅延優先モード</Text>
            <Switch
              value={priorityMode}
              onValueChange={setPriorityMode}
              trackColor={{ false: '#767577', true: '#FF6347' }}
            />
          </View>
          <Text style={styles.settingDescription}>
            遅延関連の配車を優先的に受け付けます
          </Text>
        </View>

        <View style={styles.stationCard}>
          <Text style={styles.cardTitle}>駅待機列</Text>
          <TouchableOpacity
            style={styles.stationSelector}
            onPress={() => {
              setShowStationModal(true);
              if (filteredStations.length === 0) {
                loadNearbyStations();
              }
            }}
          >
            <Text style={styles.stationSelectorText}>
              {selectedStation ?
                `${selectedStation.name} (${selectedStation.prefecture})` :
                '駅を選択'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          {selectedStation && (
            <Text style={styles.queueInfo}>
              待機順位: {Math.floor(Math.random() * 10) + 1}番目
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.modeSwitchButton}
          onPress={() => onModeChange && onModeChange('customer')}
        >
          <Ionicons name="person" size={24} color="white" />
          <Text style={styles.modeSwitchButtonText}>お客様モードに切り替え</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Ride Request Modal */}
      <Modal
        visible={showRideModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {currentRide?.isDelayRelated && (
              <View style={styles.modalPriorityHeader}>
                <Ionicons name="warning" size={20} color="white" />
                <Text style={styles.modalPriorityText}>遅延関連・高需要</Text>
              </View>
            )}
            <Text style={styles.modalTitle}>新規配車リクエスト</Text>
            {currentRide && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>乗車地点:</Text>
                  <Text style={styles.modalValue}>{currentRide.pickup}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>降車地点:</Text>
                  <Text style={styles.modalValue}>{currentRide.dropoff}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>予想料金:</Text>
                  <Text style={styles.modalValue}>
                    ¥{currentRide.fare}
                    {currentRide.surgeMultiplier > 1 && (
                      <Text style={styles.modalSurge}> (サージ料金適用)</Text>
                    )}
                  </Text>
                </View>
                {currentRide.delayInfo && (
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalLabel}>遅延情報:</Text>
                    <Text style={styles.modalValue}>{currentRide.delayInfo}</Text>
                  </View>
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.acceptButton]}
                    onPress={() => acceptRide(currentRide)}
                  >
                    <Text style={styles.acceptButtonText}>受付</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.declineButton]}
                    onPress={declineRide}
                  >
                    <Text style={styles.declineButtonText}>拒否</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Station Selection Modal - keep existing */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>駅を選択</Text>
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
                placeholder="駅名・都道府県で検索"
                value={stationSearchQuery}
                onChangeText={searchStations}
              />
            </View>

            <FlatList
              data={filteredStations}
              keyExtractor={(item) => item.id.toString()}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stationOption}
                  onPress={() => {
                    setSelectedStation(item);
                    setShowStationModal(false);
                    setStationSearchQuery('');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stationOptionName}>{item.name}</Text>
                    <Text style={styles.stationOptionDetails}>
                      {item.prefecture} • {item.lines?.join(', ') || '不明'}
                    </Text>
                  </View>
                  {item.distance && (
                    <Text style={styles.stationDistance}>
                      {item.distance < 1000 ?
                        `${Math.round(item.distance)}m` :
                        `${(item.distance / 1000).toFixed(1)}km`}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ff6b6b',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
    color: 'white',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    color: 'white',
    marginRight: 10,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  alertsContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFE4E1',
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6347',
    marginLeft: 8,
    flex: 1,
  },
  alertToggle: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  unreadAlert: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFD0D0',
  },
  alertContent: {
    flex: 1,
  },
  alertStation: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  alertDelay: {
    fontSize: 12,
    color: '#FF6347',
    marginTop: 2,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertDistance: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  mapToggleCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapToggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
    color: '#333',
  },
  demandContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  demandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  demandTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  delayedStationsSection: {
    marginBottom: 15,
  },
  delayedStationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6347',
    marginBottom: 10,
  },
  delayedStationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFE4E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FF6347',
  },
  delayedStationInfo: {
    flex: 1,
  },
  delayedStationName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  delayedStationDelay: {
    fontSize: 12,
    color: '#FF6347',
    marginTop: 2,
  },
  delayedStationMeta: {
    alignItems: 'flex-end',
  },
  surgeIndicator: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6347',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  demandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  demandCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    width: '48%',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  demandCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  demandEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  demandLevel: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  demandLocation: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  demandTime: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
  },
  demandStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 5,
  },
  demandStatText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  surgeBadge: {
    fontSize: 10,
    color: 'white',
    backgroundColor: '#FF6347',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  earningsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
  },
  earningsBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 15,
  },
  earningItem: {
    alignItems: 'center',
  },
  earningLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  earningValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  earningValueSurge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6347',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  currentRideCard: {
    backgroundColor: '#FFF8DC',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  priorityRideCard: {
    backgroundColor: '#FFE4E1',
    borderColor: '#FF6347',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6347',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginBottom: 10,
  },
  priorityBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  rideInfo: {
    marginVertical: 10,
  },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  rideText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  surgeText: {
    color: '#FF6347',
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRowBorder: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  stationCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  stationSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  stationSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  queueInfo: {
    marginTop: 10,
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
  modalPriorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6347',
    marginTop: -20,
    marginHorizontal: -20,
    marginBottom: 15,
    padding: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalPriorityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
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
    textAlign: 'center',
  },
  closeButton: {
    padding: 5,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSurge: {
    color: '#FF6347',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  declineButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  stationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stationOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stationOptionDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  stationDistance: {
    fontSize: 14,
    color: '#999',
  },
});
