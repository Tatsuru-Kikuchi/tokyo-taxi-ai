import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import CustomerScreen from './screens/CustomerScreen';
import DriverScreen from './screens/DriverScreen';

export default function App() {
  const [mode, setMode] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          '位置情報の許可が必要です',
          'このアプリは配車サービスのために位置情報を使用します。',
          [
            { text: '後で', style: 'cancel' },
            { text: '設定を開く', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
  };

  const handleSwitchMode = () => {
    // Switch between customer and driver mode
    setMode(mode === 'customer' ? 'driver' : 'customer');
  };

  const handleBackToSelection = () => {
    // Go back to mode selection screen
    setMode(null);
  };

  // Show the appropriate screen based on mode
  if (mode === 'customer') {
    return (
      <SafeAreaProvider>
        <CustomerScreen 
          onSwitchMode={handleSwitchMode}
          onBackToSelection={handleBackToSelection}
        />
      </SafeAreaProvider>
    );
  }

  if (mode === 'driver') {
    return (
      <SafeAreaProvider>
        <DriverScreen 
          onSwitchMode={handleSwitchMode}
          onBackToSelection={handleBackToSelection}
        />
      </SafeAreaProvider>
    );
  }

  // Main selection screen
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContainer}>
          <View style={styles.header}>
            <Text style={styles.logo}>🚕</Text>
            <Text style={styles.title}>全国AIタクシー</Text>
            <Text style={styles.subtitle}>AI技術で革新する配車サービス</Text>
            <Text style={styles.version}>Version 3.0.0 (Build 60)</Text>
          </View>

          <TouchableOpacity 
            style={[styles.modeButton, styles.customerButton]}
            onPress={() => handleModeSelect('customer')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>👤</Text>
            <Text style={styles.buttonTitle}>お客様として利用</Text>
            <Text style={styles.buttonSubtitle}>タクシーを呼ぶ</Text>
            <View style={styles.buttonFeatures}>
              <Text style={styles.featureText}>• AI配車最適化</Text>
              <Text style={styles.featureText}>• リアルタイム追跡</Text>
              <Text style={styles.featureText}>• LINE連携</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.modeButton, styles.driverButton]}
            onPress={() => handleModeSelect('driver')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>🚗</Text>
            <Text style={styles.buttonTitle}>ドライバーとして利用</Text>
            <Text style={styles.buttonSubtitle}>配車を受ける</Text>
            <View style={styles.buttonFeatures}>
              <Text style={styles.featureText}>• AI需要予測</Text>
              <Text style={styles.featureText}>• 収益最適化</Text>
              <Text style={styles.featureText}>• 天気連動</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>位置情報:</Text>
              <Text style={[styles.statusValue, { color: locationPermission ? '#4CAF50' : '#ff6b6b' }]}>
                {locationPermission ? '許可済み ✓' : '未許可 ✗'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>サーバー:</Text>
              <Text style={[styles.statusValue, { color: '#4CAF50' }]}>
                接続可能 ✓
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>全国47都道府県対応予定</Text>
            <Text style={styles.footerSubtext}>
              現在対応: 東京・大阪・名古屋・福岡・札幌・仙台・広島・京都
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  mainContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 70,
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  version: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  modeButton: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  customerButton: {
    backgroundColor: '#667eea',
  },
  driverButton: {
    backgroundColor: '#ff6b6b',
  },
  buttonIcon: {
    fontSize: 45,
    marginBottom: 10,
  },
  buttonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  buttonSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  buttonFeatures: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  featureText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 3,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 5,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
