import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
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
          </View>
        </View>

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
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 15,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
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
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
  },
});

export default DriverScreen;