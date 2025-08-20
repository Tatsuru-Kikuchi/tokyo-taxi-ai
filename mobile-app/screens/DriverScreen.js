<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
=======
import React, { useState } from 'react';
>>>>>>> origin/main
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
<<<<<<< HEAD
  Alert,
  Modal,
  Switch
} from 'react-native';
import * as Location from 'expo-location';

const DriverScreen = ({ onSwitchMode, onBackToSelection }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 28500,
    rides: 23,
    hours: 8
  });
  const [currentRide, setCurrentRide] = useState(null);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [selectedStation, setSelectedStation] = useState('東京駅');
  const [queuePosition, setQueuePosition] = useState(3);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (isOnline && autoAccept) {
      const timer = setTimeout(() => {
        simulateRideRequest();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, autoAccept]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
      }
    })();
  }, []);

  const simulateRideRequest = () => {
    const requests = [
      { from: '六本木', to: '羽田空港', fare: 5800, distance: '18km', surge: 1.2 },
      { from: '新宿駅', to: '東京駅', fare: 2400, distance: '7km', surge: 1.0 },
      { from: '渋谷', to: '品川', fare: 2100, distance: '6km', surge: 1.1 }
    ];
    const randomRequest = requests[Math.floor(Math.random() * requests.length)];
    setCurrentRide({
      ...randomRequest,
      confirmationNumber: Math.floor(1000 + Math.random() * 9000)
    });
    setShowRideRequest(true);
    
    if (autoAccept) {
      setTimeout(() => acceptRide(), 2000);
    }
  };

  const acceptRide = () => {
    setShowRideRequest(false);
    setEarnings(prev => ({
      ...prev,
      today: prev.today + (currentRide?.fare || 0),
      rides: prev.rides + 1
    }));
    Alert.alert('配車確定', `確認番号: ${currentRide?.confirmationNumber}`);
  };

  const stations = ['東京駅', '新宿駅', '渋谷駅', '品川駅', '上野駅', '池袋駅'];

  const recommendations = [
    { area: '六本木エリア', surge: 'x1.3', reason: '雨予報' },
    { area: '羽田空港', surge: 'x1.2', reason: '到着ラッシュ' },
    { area: '東京駅', surge: 'x1.1', reason: '新幹線到着' }
  ];

  const MapComponent = () => {
    try {
      const MapView = require('react-native-maps').default;
      const { Marker } = require('react-native-maps');
      
      if (!location) {
        return (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>📍 位置情報を取得中...</Text>
=======
  Switch,
} from 'react-native';

const DriverScreen = ({ onSwitchMode, onBackToSelection }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [confirmationNumber] = useState(Math.floor(1000 + Math.random() * 9000));
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚗</Text>
          <Text style={styles.title}>ドライバーモード</Text>
          <Text style={styles.subtitle}>全国AIタクシー</Text>
          <View style={styles.earningsBadge}>
            <Text style={styles.earningsText}>手数料15%のみ (GOは25%)</Text>
>>>>>>> origin/main
          </View>
        );
      }

<<<<<<< HEAD
      return (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <Marker
            coordinate={location}
            title="現在地"
            pinColor={isOnline ? "green" : "gray"}
          />
          {recommendations.map((rec, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: location.latitude + (Math.random() - 0.5) * 0.02,
                longitude: location.longitude + (Math.random() - 0.5) * 0.02,
              }}
              title={rec.area}
              description={`${rec.surge} - ${rec.reason}`}
              pinColor="orange"
            />
          ))}
        </MapView>
      );
    } catch (error) {
      return (
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>🗺️ AIホットスポットマップ</Text>
            <Text style={styles.mapSubtitle}>高需要エリア表示中</Text>
          </View>
          
          <View style={styles.hotspotGrid}>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.hotspotCard}>
                <Text style={styles.hotspotEmoji}>📍</Text>
                <Text style={styles.hotspotArea}>{rec.area}</Text>
                <Text style={styles.hotspotSurge}>{rec.surge}</Text>
                <Text style={styles.hotspotReason}>{rec.reason}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>ドライバーモード</Text>
          <Text style={styles.subtitle}>全国AIタクシー</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>運行状態</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isOnline ? "#4CAF50" : "#f4f3f4"}
            />
          </View>
          <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#999' }]}>
            {isOnline ? 'オンライン - 配車受付中' : 'オフライン'}
          </Text>
        </View>

        <View style={styles.autoAcceptCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>自動受諾</Text>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={autoAccept ? "#2196F3" : "#f4f3f4"}
            />
          </View>
          <Text style={styles.autoAcceptText}>
            {autoAccept ? 'AI最適配車 ON' : 'AI最適配車 OFF'}
          </Text>
        </View>

        {currentRide && (
          <View style={styles.currentRideCard}>
            <Text style={styles.currentRideTitle}>現在の配車</Text>
            <Text style={styles.confirmationNumber}>確認番号: {currentRide.confirmationNumber}</Text>
            <Text style={styles.rideDetails}>
              {currentRide.from} → {currentRide.to}
            </Text>
            <Text style={styles.rideFare}>料金: ¥{currentRide.fare}</Text>
          </View>
        )}

        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>本日の収益</Text>
          <Text style={styles.earningsAmount}>¥{earnings.today.toLocaleString()}</Text>
          <View style={styles.earningsDetails}>
            <View style={styles.earningsStat}>
              <Text style={styles.statValue}>{earnings.rides}</Text>
              <Text style={styles.statLabel}>完了</Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.statValue}>{earnings.hours}h</Text>
              <Text style={styles.statLabel}>稼働</Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.statValue}>¥{Math.round(earnings.today / earnings.hours)}</Text>
              <Text style={styles.statLabel}>時給</Text>
=======
        {/* Online Status */}
        <View style={styles.statusBox}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>運行状態</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isOnline ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.statusText}>
            {isOnline ? '配車受付中' : 'オフライン'}
          </Text>
        </View>

        {/* Auto Accept */}
        <View style={styles.autoAcceptBox}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>自動受諾</Text>
            <Switch
              value={autoAccept}
              onValueChange={setAutoAccept}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={autoAccept ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Current Ride */}
        <View style={styles.rideBox}>
          <Text style={styles.rideTitle}>現在の配車</Text>
          <Text style={styles.confirmationLabel}>確認番号</Text>
          <Text style={styles.confirmationNumber}>{confirmationNumber}</Text>
          <View style={styles.rideDetails}>
            <Text style={styles.rideText}>お客様: 山田様</Text>
            <Text style={styles.rideText}>乗車: 新宿駅</Text>
            <Text style={styles.rideText}>降車: 渋谷区1-2-3</Text>
            <Text style={styles.fareText}>収入: ¥2,380 (85%)</Text>
          </View>
          <TouchableOpacity style={styles.completeButton}>
            <Text style={styles.completeButtonText}>配車完了</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Earnings */}
        <View style={styles.earningsBox}>
          <Text style={styles.earningsTitle}>本日の収益 ☔x1.1</Text>
          <Text style={styles.earningsAmount}>¥28,500</Text>
          <View style={styles.earningsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>完了</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>6.0</Text>
              <Text style={styles.statLabel}>時間</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐4.8</Text>
              <Text style={styles.statLabel}>評価</Text>
>>>>>>> origin/main
            </View>
          </View>
          <TouchableOpacity style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>詳細を見る →</Text>
          </TouchableOpacity>
        </View>

        {/* Station Queue */}
        <TouchableOpacity style={styles.stationButton}>
          <Text style={styles.stationButtonText}>駅待機列</Text>
          <Text style={styles.stationSubtext}>タップして駅を選択 →</Text>
        </TouchableOpacity>

        {/* Weather & AI */}
        <View style={styles.aiBox}>
          <Text style={styles.aiTitle}>AIおすすめ</Text>
          <View style={styles.aiItem}>
            <Text style={styles.aiIcon}>☔</Text>
            <Text style={styles.aiText}>雨天のため新宿駅周辺の需要が30%増加中</Text>
            <TouchableOpacity>
              <Text style={styles.aiLink}>今すぐ向かう →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.aiItem}>
            <Text style={styles.aiIcon}>🚆</Text>
            <Text style={styles.aiText}>終電後の23:30-25:00は収益が最大化</Text>
            <Text style={styles.aiSubtext}>推奨待機時間</Text>
          </View>
        </View>

        {/* GO Comparison */}
        <View style={styles.comparisonBox}>
          <Text style={styles.comparisonTitle}>GOとの比較</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>手数料:</Text>
              <Text style={styles.ourValue}>当社 15%</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}> </Text>
              <Text style={styles.goValue}>GO 25%</Text>
            </View>
          </View>
          <Text style={styles.comparisonResult}>月収50万の場合: ¥425,000 vs ¥375,000</Text>
          <View style={styles.savingsBox}>
            <Text style={styles.savingsAmount}>差額: +¥50,000/月 (年間+¥600,000)</Text>
          </View>
        </View>

<<<<<<< HEAD
        <View style={styles.mapContainer}>
          <MapComponent />
        </View>

        <View style={styles.stationCard}>
          <Text style={styles.stationTitle}>駅待機場所</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {stations.map((station, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.stationButton,
                  selectedStation === station && styles.stationButtonActive
                ]}
                onPress={() => {
                  setSelectedStation(station);
                  setQueuePosition(Math.floor(Math.random() * 10) + 1);
                }}
              >
                <Text style={[
                  styles.stationText,
                  selectedStation === station && styles.stationTextActive
                ]}>
                  {station}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedStation && (
            <Text style={styles.queueText}>
              {selectedStation}待機中 - {queuePosition}番目
            </Text>
          )}
        </View>

        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>AI推奨エリア</Text>
          {recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <View style={styles.recommendationLeft}>
                <Text style={styles.recommendationArea}>{rec.area}</Text>
                <Text style={styles.recommendationReason}>{rec.reason}</Text>
              </View>
              <Text style={styles.recommendationSurge}>{rec.surge}</Text>
            </View>
          ))}
        </View>

        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>GO比較</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>手数料率</Text>
            <Text style={styles.comparisonValue}>15% (GOは25%)</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>月収差額</Text>
            <Text style={styles.comparisonValueHighlight}>+¥50,000/月</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.switchButton} onPress={onSwitchMode}>
            <Text style={styles.switchButtonText}>お客様モードに切り替え</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
            <Text style={styles.backButtonText}>モード選択に戻る</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showRideRequest}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>新規配車リクエスト</Text>
              {currentRide && (
                <>
                  <Text style={styles.modalRoute}>
                    {currentRide.from} → {currentRide.to}
                  </Text>
                  <Text style={styles.modalDistance}>距離: {currentRide.distance}</Text>
                  <Text style={styles.modalFare}>予想料金: ¥{currentRide.fare}</Text>
                  {currentRide.surge > 1 && (
                    <Text style={styles.modalSurge}>サージ: x{currentRide.surge}</Text>
                  )}
                </>
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => setShowRideRequest(false)}
                >
                  <Text style={styles.rejectButtonText}>拒否</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={acceptRide}
                >
                  <Text style={styles.acceptButtonText}>受諾</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
=======
        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.switchButton}
          onPress={onSwitchMode}
        >
          <Text style={styles.switchButtonText}>お客様モードに切り替え</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBackToSelection}
        >
          <Text style={styles.backButtonText}>モード選択に戻る</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>24/7ドライバーサポート</Text>
          <Text style={styles.footerText}>収益最大化のAIアドバイス</Text>
        </View>
>>>>>>> origin/main
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
<<<<<<< HEAD
=======
  scrollView: {
    flex: 1,
  },
>>>>>>> origin/main
  header: {
    backgroundColor: '#ff6b6b',
    padding: 20,
    alignItems: 'center',
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
<<<<<<< HEAD
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  statusCard: {
=======
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  earningsBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  earningsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusBox: {
>>>>>>> origin/main
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
<<<<<<< HEAD
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginTop: 5,
  },
  autoAcceptCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  autoAcceptText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  currentRideCard: {
    backgroundColor: '#4CAF50',
=======
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusText: {
    fontSize: 14,
    color: '#28a745',
    marginTop: 10,
    textAlign: 'center',
  },
  autoAcceptBox: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideBox: {
    backgroundColor: '#28a745',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  rideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  confirmationLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  confirmationNumber: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 15,
  },
  rideDetails: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
  },
  rideText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  fareText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  completeButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 20,
    marginTop: 15,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: 'bold',
  },
  earningsBox: {
    backgroundColor: 'white',
>>>>>>> origin/main
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  currentRideTitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  confirmationNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
  rideDetails: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  },
  rideFare: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
  earningsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
<<<<<<< HEAD
    borderRadius: 10,
=======
    borderRadius: 15,
>>>>>>> origin/main
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsTitle: {
    fontSize: 16,
<<<<<<< HEAD
    color: '#666',
    marginBottom: 5,
=======
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
>>>>>>> origin/main
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
<<<<<<< HEAD
    color: '#4CAF50',
  },
  earningsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  earningsStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  mapContainer: {
    height: 200,
    margin: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e8f4f8',
    padding: 15,
  },
  mapHeader: {
    marginBottom: 15,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  mapSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 80,
  },
  hotspotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hotspotCard: {
    width: '30%',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  hotspotEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  hotspotArea: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  hotspotSurge: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: 'bold',
    marginTop: 2,
  },
  hotspotReason: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  stationCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stationButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  stationButtonActive: {
    backgroundColor: '#2196F3',
  },
  stationText: {
    fontSize: 14,
    color: '#666',
  },
  stationTextActive: {
    color: 'white',
  },
  queueText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recommendationLeft: {
    flex: 1,
  },
  recommendationArea: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recommendationSurge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  comparisonCard: {
    backgroundColor: '#fff3cd',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
=======
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 15,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
>>>>>>> origin/main
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  comparisonValueHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
<<<<<<< HEAD
  buttonContainer: {
    margin: 15,
=======
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 5,
  },
  detailsButton: {
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#007bff',
    fontSize: 14,
  },
  stationButton: {
    backgroundColor: '#e7f3ff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  stationButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  stationSubtext: {
    fontSize: 14,
    color: '#007bff',
  },
  aiBox: {
    backgroundColor: '#fff3cd',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#856404',
  },
  aiItem: {
    marginBottom: 15,
  },
  aiIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  aiText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
  aiLink: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiSubtext: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
  },
  comparisonBox: {
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
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  comparisonItem: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  ourValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  goValue: {
    fontSize: 18,
    color: '#6c757d',
  },
  comparisonResult: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 10,
  },
  savingsBox: {
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  savingsAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
>>>>>>> origin/main
  },
  switchButton: {
    backgroundColor: '#667eea',
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
    marginBottom: 15,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
<<<<<<< HEAD
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalRoute: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDistance: {
=======
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerTitle: {
>>>>>>> origin/main
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalFare: {
    fontSize: 18,
    fontWeight: 'bold',
<<<<<<< HEAD
    color: '#4CAF50',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalSurge: {
    fontSize: 14,
    color: '#ff6b6b',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  rejectButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 20,
    marginLeft: 10,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
=======
    color: '#1a1a1a',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
>>>>>>> origin/main
  },
});

export default DriverScreen;