import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';

const CustomerScreen = ({ onSwitchMode, onBackToSelection }) => {
  const [confirmationNumber] = useState(Math.floor(1000 + Math.random() * 9000));
  const [fare] = useState(3834);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚕</Text>
          <Text style={styles.title}>お客様モード</Text>
          <Text style={styles.subtitle}>全国AIタクシー</Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>GOより ¥1,380お得!</Text>
          </View>
        </View>

        {/* Confirmation Number */}
        <View style={styles.confirmationBox}>
          <Text style={styles.confirmationLabel}>確認番号</Text>
          <Text style={styles.confirmationNumber}>{confirmationNumber}</Text>
          <Text style={styles.confirmationHint}>ドライバーにこの番号を見せてください</Text>
        </View>

        {/* Fare Calculator */}
        <View style={styles.fareBox}>
          <Text style={styles.fareLabel}>料金計算</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareText}>降車駅: 新宿駅</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareText}>自宅住所: 渋谷区1-1-1</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareText}>予想料金</Text>
            <Text style={styles.fareAmount}>¥{fare.toLocaleString()}</Text>
          </View>
          <Text style={styles.fareNote}>☔ 小雨料金 (+15%)</Text>
        </View>

        {/* Train Sync */}
        <TouchableOpacity style={styles.trainButton}>
          <Text style={styles.trainIcon}>🚆</Text>
          <Text style={styles.trainText}>電車の到着時刻と同期</Text>
        </TouchableOpacity>

        {/* Nearby Drivers */}
        <View style={styles.driversBox}>
          <Text style={styles.driversTitle}>15名のドライバーが待機中</Text>
          <View style={styles.driversRow}>
            <Text style={styles.driverItem}>🚕 2分</Text>
            <Text style={styles.driverItem}>🚕 3分</Text>
            <Text style={styles.driverItem}>🚕 5分</Text>
          </View>
        </View>

        {/* Weather Info */}
        <View style={styles.weatherBox}>
          <Text style={styles.weatherTitle}>天気情報</Text>
          <Text style={styles.weatherText}>小雨 | 22°C</Text>
          <Text style={styles.weatherAlert}>需要増加中 - 早めの予約をお勧めします</Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>19:43に予約</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton}
          onPress={onSwitchMode}
        >
          <Text style={styles.switchButtonText}>ドライバーモードに切り替え</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBackToSelection}
        >
          <Text style={styles.backButtonText}>モード選択に戻る</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>全国47都道府県対応</Text>
          <Text style={styles.supportText}>24/7サポート・隠れた料金なし</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#667eea',
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
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  savingsBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  savingsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
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
  trainButton: {
    backgroundColor: '#17a2b8',
    margin: 15,
    padding: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  trainText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 14,
    color: '#0056b3',
  },
  weatherBox: {
    backgroundColor: '#fff3cd',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  weatherTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#856404',
  },
  weatherText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
  weatherAlert: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
  },
  bookButton: {
    backgroundColor: '#28a745',
    margin: 15,
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
  },
  bookButtonText: {
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
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  supportText: {
    fontSize: 12,
    color: '#6c757d',
  },
});

export default CustomerScreen;