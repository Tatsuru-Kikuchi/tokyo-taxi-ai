import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverScreen({ onBack, currentLocation, serviceStatus }) {
  const [isOnline, setIsOnline] = useState(false);
  const [dailyEarnings, setDailyEarnings] = useState(28500);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      <View style={styles.gradientBackground}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with Status */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>ドライバーモード</Text>
            <Text style={styles.headerSubtitle}>
              {isOnline ? 'オンライン中' : 'オフライン'}
            </Text>
          </View>

          {/* Online/Offline Toggle */}
          <View style={styles.cardContainer}>
            <View style={[styles.toggleCard, isOnline ? styles.toggleOnline : styles.toggleOffline]}>
              <TouchableOpacity
                style={styles.onlineToggle}
                onPress={() => setIsOnline(!isOnline)}
              >
                <Text style={styles.toggleIcon}>{isOnline ? '🚕' : '🅿️'}</Text>
                <Text style={styles.toggleText}>
                  {isOnline ? '配車受付中' : '配車受付停止中'}
                </Text>
                <Text style={styles.toggleSubtext}>
                  {isOnline ? 'タップして停止' : 'タップして開始'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today's Performance */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 本日の実績</Text>
              <View style={styles.performanceGrid}>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceValue}>¥{dailyEarnings.toLocaleString()}</Text>
                  <Text style={styles.performanceLabel}>売上</Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceValue}>12</Text>
                  <Text style={styles.performanceLabel}>配車回数</Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceValue}>94%</Text>
                  <Text style={styles.performanceLabel}>受諾率</Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceValue}>4.8</Text>
                  <Text style={styles.performanceLabel}>評価</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Current Location */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 現在地情報</Text>
              {currentLocation ? (
                <View>
                  <Text style={styles.locationText}>
                    緯度: {currentLocation.latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.locationText}>
                    経度: {currentLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.locationText}>位置情報を取得中...</Text>
              )}
            </View>
          </View>

          {/* Service Status */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚙️ サービス状況</Text>
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>位置情報</Text>
                <Text style={[styles.serviceStatus, serviceStatus?.location ? styles.serviceOnline : styles.serviceOffline]}>
                  {serviceStatus?.location ? '✓ 利用可能' : '✗ 利用不可'}
                </Text>
              </View>
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>バックエンド</Text>
                <Text style={[styles.serviceStatus, serviceStatus?.backend ? styles.serviceOnline : styles.serviceOffline]}>
                  {serviceStatus?.backend ? '✓ 接続中' : '✗ 切断'}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← モード選択に戻る</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  headerContainer: {
    padding: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  cardContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  toggleCard: {
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  toggleOnline: {
    backgroundColor: '#2ed573',
  },
  toggleOffline: {
    backgroundColor: '#747d8c',
  },
  onlineToggle: {
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  toggleSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  performanceItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ed573',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  serviceLabel: {
    fontSize: 14,
    color: '#666',
  },
  serviceStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  serviceOnline: {
    color: '#2ed573',
  },
  serviceOffline: {
    color: '#ff4757',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
