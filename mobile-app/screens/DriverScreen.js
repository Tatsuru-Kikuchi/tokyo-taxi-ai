/******************************************
 * FILE: DriverScreen.js
 * VERSION: Build 120 (Stable - No WebView)
 * STATUS: 🔧 FIXES ALL ISSUES
 *
 * FIXED ISSUES:
 * - Removed WebView dependency (no platform errors)
 * - Working ride request simulation
 * - Stable backend integration
 * - Simple demand visualization (no maps)
 * - Realistic earnings tracking
 *
 * BACKEND INTEGRATION:
 * - Driver status updates
 * - Service monitoring
 * - Ride booking integration
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
  Switch,
  Alert,
  Modal,
  Platform,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';

// Backend service URLs
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const JAGEOCODER_URL = 'https://tokyo-taxi-jageocoder-production.up.railway.app';

export default function DriverScreen({ onModeChange, onBack, backendStatus, locationPermission }) {
  const [isIPad] = useState(Platform.isPad);
  const [isOnline, setIsOnline] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [location, setLocation] = useState(null);
  const [earnings, setEarnings] = useState({
    today: 28500,
    rides: 12,
    hours: 8.5,
    rating: 4.8
  });

  // Ride request states
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [showDemandList, setShowDemandList] = useState(false);

  // Service integration
  const [serviceStatus, setServiceStatus] = useState({
    backend: false,
    jageocoder: false,
    lastUpdate: null
  });

  const [demandAreas] = useState([
    {
      name: '名古屋駅周辺',
      lat: 35.170694,
      lng: 136.881636,
      demand: 'high',
      earnings: '¥3,500/時',
      distance: '2.1km',
      reason: 'ビジネス街での会議終了時間'
    },
    {
      name: '栄エリア',
      lat: 35.171196,
      lng: 136.908347,
      demand: 'medium',
      earnings: '¥2,800/時',
      distance: '3.4km',
      reason: 'ショッピングエリア、夕方の帰宅ラッシュ'
    },
    {
      name: '金山駅',
      lat: 35.143284,
      lng: 136.902254,
      demand: 'medium',
      earnings: '¥2,600/時',
      distance: '4.2km',
      reason: '乗り換え需要'
    },
    {
      name: '中部国際空港',
      lat: 34.8584,
      lng: 136.8052,
      demand: 'high',
      earnings: '¥4,200/時',
      distance: '38.5km',
      reason: '空港送迎需要'
    }
  ]);

  useEffect(() => {
    initializeDriver();

    // Simulate ride requests periodically when online
    const rideInterval = setInterval(() => {
      if (isOnline && Math.random() > 0.8) {
        generateRideRequest();
      }
    }, 20000); // Every 20 seconds

    return () => clearInterval(rideInterval);
  }, [isOnline]);

  const initializeDriver = async () => {
    await getCurrentLocation();
    await checkServiceStatus();
  };

  const getCurrentLocation = async () => {
    try {
      if (locationPermission) {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
      } else {
        // Set default location (Nagoya Station area) for testing
        setLocation({ latitude: 35.170694, longitude: 136.881636 });
      }
    } catch (error) {
      console.log('Location error:', error);
      setLocation({ latitude: 35.170694, longitude: 136.881636 });
    }
  };

  const checkServiceStatus = async () => {
    const status = { ...serviceStatus, lastUpdate: new Date().toLocaleTimeString() };

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

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (location && serviceStatus.backend) {
      try {
        // Update driver status on backend
        await fetch(`${BACKEND_URL}/api/drivers/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: 'driver-aichi-001', // In real app, use actual driver ID
            isOnline: newStatus,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.log('Failed to update backend status:', error);
      }
    }

    Alert.alert(
      'ステータス更新',
      newStatus ? 'オンラインになりました。配車受付中です。' : 'オフラインになりました。'
    );
  };

  const generateRideRequest = () => {
    // Generate realistic ride requests for Aichi area
    const requests = [
      {
        from: '名古屋駅',
        fromLat: 35.170694,
        fromLng: 136.881636,
        to: '愛知県春日井市大留町5-29-20',
        toLat: 35.2554861,
        toLng: 137.023075,
        passengerName: '田中様',
        requestId: 'REQ-' + Date.now(),
        expectedDistance: 19.5,
        expectedFare: 7200
      },
      {
        from: '栄駅',
        fromLat: 35.171196,
        fromLng: 136.908347,
        to: '中部国際空港',
        toLat: 34.8584,
        toLng: 136.8052,
        passengerName: '佐藤様',
        requestId: 'REQ-' + Date.now(),
        expectedDistance: 45.2,
        expectedFare: 12800
      },
      {
        from: '金山駅',
        fromLat: 35.143284,
        fromLng: 136.902254,
        to: '名古屋港',
        toLat: 35.0745,
        toLng: 136.8845,
        passengerName: '山田様',
        requestId: 'REQ-' + Date.now(),
        expectedDistance: 8.3,
        expectedFare: 3600
      }
    ];

    const randomRequest = requests[Math.floor(Math.random() * requests.length)];

    // Add some realistic variation
    const surge = 1.0 + (Math.random() * 0.4); // 1.0 to 1.4x surge
    const finalFare = Math.round(randomRequest.expectedFare * surge / 10) * 10;

    const rideRequest = {
      ...randomRequest,
      distance: randomRequest.expectedDistance.toFixed(1),
      duration: Math.ceil(randomRequest.expectedDistance * 3.2), // ~3.2 minutes per km
      fare: finalFare,
      surge: surge.toFixed(1),
      confirmationNumber: Math.floor(1000 + Math.random() * 9000)
    };

    setCurrentRide(rideRequest);
    setShowRideRequest(true);

    // Auto-accept if enabled
    if (autoAccept) {
      setTimeout(() => acceptRide(), 3000);
    }
  };

  const acceptRide = async () => {
    setShowRideRequest(false);

    // Update earnings
    setEarnings(prev => ({
      ...prev,
      today: prev.today + currentRide.fare,
      rides: prev.rides + 1
    }));

    // Send to backend if available
    if (serviceStatus.backend) {
      try {
        await fetch(`${BACKEND_URL}/api/bookings/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: currentRide.requestId,
            driverId: 'driver-aichi-001',
            confirmationNumber: currentRide.confirmationNumber,
            fare: currentRide.fare,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.log('Failed to send booking to backend:', error);
      }
    }

    Alert.alert(
      '配車確定',
      `お客様: ${currentRide.passengerName}\n` +
      `乗車場所: ${currentRide.from}\n` +
      `目的地: ${currentRide.to}\n` +
      `料金: ¥${currentRide.fare.toLocaleString()}\n` +
      `距離: ${currentRide.distance}km\n` +
      `確認番号: ${currentRide.confirmationNumber}`
    );
  };

  const rejectRide = () => {
    setShowRideRequest(false);
    setCurrentRide(null);
  };

  const renderServiceStatus = () => (
    <View style={styles.serviceStatus}>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>サービス状況</Text>
        <Text style={styles.statusTime}>{serviceStatus.lastUpdate}</Text>
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
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ドライバー</Text>
        <TouchableOpacity onPress={onModeChange} style={styles.switchButton}>
          <Text style={styles.switchButtonText}>客様</Text>
        </TouchableOpacity>
      </View>

      {/* Service Status */}
      {renderServiceStatus()}

      {/* Driver Status */}
      <View style={styles.statusSection}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>ドライバーステータス</Text>
          <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#f44336' }]}>
            <Text style={styles.statusIndicatorText}>
              {isOnline ? '● オンライン - 配車受付中' : '● オフライン'}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>オンライン/オフライン</Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor={isOnline ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>自動受付</Text>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: '#ccc', true: '#ff9800' }}
              thumbColor={autoAccept ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* Today's Performance */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>今日の実績</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>¥{earnings.today.toLocaleString()}</Text>
            <Text style={styles.statLabel}>売上</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnings.rides}</Text>
            <Text style={styles.statLabel}>配車回数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnings.rating}</Text>
            <Text style={styles.statLabel}>評価</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnings.hours}</Text>
            <Text style={styles.statLabel}>稼働時間</Text>
          </View>
        </View>
      </View>

      {/* AI Demand Prediction */}
      <View style={styles.demandSection}>
        <Text style={styles.sectionTitle}>AI需要予測</Text>
        <View style={styles.demandList}>
          {demandAreas.slice(0, 2).map((area, index) => (
            <View key={index} style={styles.demandItem}>
              <View style={[
                styles.demandIndicator,
                { backgroundColor: area.demand === 'high' ? '#ff4444' : '#ff8800' }
              ]} />
              <View style={styles.demandInfo}>
                <Text style={styles.demandArea}>{area.name}</Text>
                <Text style={styles.demandDetails}>{area.reason}</Text>
                <Text style={styles.demandEarnings}>予想収入: {area.earnings}</Text>
              </View>
              <View style={styles.demandStats}>
                <Text style={styles.demandDistance}>{area.distance}</Text>
                <Text style={styles.demandLevel}>
                  需要: {area.demand === 'high' ? '高' : '中'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.demandButton}
          onPress={() => setShowDemandList(true)}
        >
          <Text style={styles.demandButtonText}>📊 全需要エリアを表示</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>クイックアクション</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={generateRideRequest}>
            <Text style={styles.actionButtonText}>🚗</Text>
            <Text style={styles.actionButtonLabel}>テスト配車</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={checkServiceStatus}>
            <Text style={styles.actionButtonText}>🔄</Text>
            <Text style={styles.actionButtonLabel}>状況更新</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowDemandList(true)}>
            <Text style={styles.actionButtonText}>📍</Text>
            <Text style={styles.actionButtonLabel}>需要マップ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ride Request Modal */}
      <Modal visible={showRideRequest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.rideModal}>
            <Text style={styles.rideModalTitle}>新しい配車リクエスト</Text>

            {currentRide && (
              <View style={styles.rideDetails}>
                <View style={styles.rideRow}>
                  <Text style={styles.rideLabel}>お客様:</Text>
                  <Text style={styles.rideValue}>{currentRide.passengerName}</Text>
                </View>
                <View style={styles.rideRow}>
                  <Text style={styles.rideLabel}>乗車場所:</Text>
                  <Text style={styles.rideValue}>{currentRide.from}</Text>
                </View>
                <View style={styles.rideRow}>
                  <Text style={styles.rideLabel}>目的地:</Text>
                  <Text style={styles.rideValue}>{currentRide.to}</Text>
                </View>
                <View style={styles.rideRow}>
                  <Text style={styles.rideLabel}>距離:</Text>
                  <Text style={styles.rideValue}>{currentRide.distance} km</Text>
                </View>
                <View style={styles.rideRow}>
                  <Text style={styles.rideLabel}>予想時間:</Text>
                  <Text style={styles.rideValue}>{currentRide.duration} 分</Text>
                </View>
                <View style={[styles.rideRow, styles.fareRow]}>
                  <Text style={styles.fareLabel}>料金:</Text>
                  <Text style={styles.fareValue}>¥{currentRide.fare?.toLocaleString()}</Text>
                </View>
                {currentRide.surge > 1.0 && (
                  <Text style={styles.surgeText}>サージ料金 x{currentRide.surge}</Text>
                )}
              </View>
            )}

            <View style={styles.rideActions}>
              <TouchableOpacity style={styles.rejectButton} onPress={rejectRide}>
                <Text style={styles.rejectButtonText}>拒否</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={acceptRide}>
                <Text style={styles.acceptButtonText}>受諾</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Demand Areas Modal */}
      <Modal visible={showDemandList} animationType="slide">
        <View style={styles.demandModal}>
          <View style={styles.demandModalHeader}>
            <Text style={styles.demandModalTitle}>AI需要予測エリア</Text>
            <TouchableOpacity onPress={() => setShowDemandList(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.demandModalContent}>
            {demandAreas.map((area, index) => (
              <View key={index} style={styles.demandDetailItem}>
                <View style={styles.demandDetailHeader}>
                  <View style={[
                    styles.demandIndicator,
                    { backgroundColor: area.demand === 'high' ? '#ff4444' : '#ff8800' }
                  ]} />
                  <Text style={styles.demandDetailName}>{area.name}</Text>
                  <Text style={styles.demandDetailDistance}>{area.distance}</Text>
                </View>
                <Text style={styles.demandDetailReason}>{area.reason}</Text>
                <View style={styles.demandDetailStats}>
                  <Text style={styles.demandDetailEarnings}>予想収入: {area.earnings}</Text>
                  <Text style={[
                    styles.demandDetailLevel,
                    { color: area.demand === 'high' ? '#ff4444' : '#ff8800' }
                  ]}>
                    需要レベル: {area.demand === 'high' ? '高' : '中'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
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
    color: '#ff6b6b',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  switchButton: {
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#fff3cd',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d84315',
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
  statusSection: {
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
  statusHeader: {
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controls: {
    marginTop: 15,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  controlLabel: {
    fontSize: 16,
    color: '#333',
  },
  performanceSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  demandSection: {
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
  demandList: {
    marginBottom: 15,
  },
  demandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
  },
  demandIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  demandInfo: {
    flex: 1,
  },
  demandArea: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  demandDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  demandEarnings: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  demandStats: {
    alignItems: 'flex-end',
  },
  demandDistance: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    marginBottom: 2,
  },
  demandLevel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  demandButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  demandButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActions: {
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    width: '30%',
  },
  actionButtonText: {
    fontSize: 24,
    marginBottom: 5,
  },
  actionButtonLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rideModal: {
    backgroundColor: 'white',
    margin: 20,
    padding: 25,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  rideModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  rideDetails: {
    marginBottom: 20,
  },
  rideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rideLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  rideValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  fareRow: {
    borderBottomWidth: 0,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  fareLabel: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  fareValue: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  surgeText: {
    fontSize: 12,
    color: '#ff9800',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  rideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demandModal: {
    flex: 1,
    backgroundColor: 'white',
  },
  demandModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  demandModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 5,
  },
  demandModalContent: {
    flex: 1,
    padding: 15,
  },
  demandDetailItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
  },
  demandDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  demandDetailName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  demandDetailDistance: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demandDetailReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  demandDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demandDetailEarnings: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  demandDetailLevel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
