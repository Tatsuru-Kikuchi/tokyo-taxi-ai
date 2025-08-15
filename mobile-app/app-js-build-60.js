import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import original screens with full features
import CustomerScreen from './screens/CustomerScreen';
import DriverScreen from './screens/DriverScreen';

// Error boundary component to catch and handle crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>アプリケーションエラー</Text>
          <Text style={styles.errorMessage}>
            問題が発生しました。アプリを再起動してください。
          </Text>
          <TouchableOpacity
            style={styles.restartButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.restartButtonText}>再試行</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Main App Component
export default function App() {
  const [mode, setMode] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState('checking');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Check saved mode preference
      const savedMode = await AsyncStorage.getItem('userMode').catch(() => null);
      
      // Request location permission with proper error handling
      await requestLocationPermission();
      
      // Check backend connectivity
      await checkNetworkStatus();
      
      // Restore previous mode if exists
      if (savedMode) {
        setMode(savedMode);
      }
      
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          '位置情報の許可が必要',
          'このアプリは配車サービスのために位置情報を使用します。設定から位置情報の使用を許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { 
              text: '設定を開く', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
      setLocationPermission(false);
    }
  };

  const checkNetworkStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        'https://tokyo-taxi-ai-backend-production.up.railway.app/health',
        {
          method: 'GET',
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setNetworkStatus('online');
      } else {
        setNetworkStatus('limited');
      }
    } catch (error) {
      console.warn('Network check failed:', error);
      setNetworkStatus('offline');
    }
  };

  const handleModeSelect = async (selectedMode) => {
    try {
      // Save mode preference
      await AsyncStorage.setItem('userMode', selectedMode);
      setMode(selectedMode);
    } catch (error) {
      console.error('Error saving mode:', error);
      setMode(selectedMode);
    }
  };

  const handleSwitchMode = () => {
    // Switch between customer and driver modes
    const newMode = mode === 'customer' ? 'driver' : 'customer';
    handleModeSelect(newMode);
  };

  const handleBackToSelection = async () => {
    try {
      await AsyncStorage.removeItem('userMode');
      setMode(null);
    } catch (error) {
      console.error('Error clearing mode:', error);
    }
    setMode(null);
  };

  // Loading screen
  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingTitle}>全国AIタクシー</Text>
            <Text style={styles.loadingSubtitle}>初期化中...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Render appropriate screen based on mode
  if (mode === 'customer') {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <CustomerScreen 
            onSwitchMode={handleSwitchMode}
            onBackToSelection={handleBackToSelection}
          />
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  if (mode === 'driver') {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <DriverScreen 
            onSwitchMode={handleSwitchMode}
            onBackToSelection={handleBackToSelection}
          />
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  // Main selection screen
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🚕</Text>
            <Text style={styles.title}>全国AIタクシー</Text>
            <Text style={styles.subtitle}>AI技術で革新する配車サービス</Text>
            <Text style={styles.version}>Version 3.0.0 (Build 60)</Text>
          </View>

          {/* Mode Selection Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.modeButton, styles.customerButton]}
              onPress={() => handleModeSelect('customer')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonIcon}>👤</Text>
              <Text style={styles.buttonTitle}>お客様として利用</Text>
              <Text style={styles.buttonSubtitle}>タクシーを呼ぶ</Text>
              <View style={styles.buttonFeatures}>
                <Text style={styles.featureText}>✓ リアルタイム配車</Text>
                <Text style={styles.featureText}>✓ AI料金予測</Text>
                <Text style={styles.featureText}>✓ 天気連動サービス</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeButton, styles.driverButton]}
              onPress={() => handleModeSelect('driver')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonIcon}>🚗</Text>
              <Text style={styles.buttonTitle}>ドライバーとして利用</Text>
              <Text style={styles.buttonSubtitle}>運行管理</Text>
              <View style={styles.buttonFeatures}>
                <Text style={styles.featureText}>✓ AI需要予測</Text>
                <Text style={styles.featureText}>✓ 収益最適化</Text>
                <Text style={styles.featureText}>✓ リアルタイム案内</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>位置情報:</Text>
              <Text style={[
                styles.statusValue,
                { color: locationPermission ? '#4CAF50' : '#ff6b6b' }
              ]}>
                {locationPermission ? '✓ 許可済み' : '✗ 未許可'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>サーバー:</Text>
              <Text style={[
                styles.statusValue,
                { 
                  color: networkStatus === 'online' ? '#4CAF50' : 
                         networkStatus === 'limited' ? '#ff9800' : '#ff6b6b' 
                }
              ]}>
                {networkStatus === 'online' ? '✓ 接続中' : 
                 networkStatus === 'limited' ? '△ 制限付き' : '✗ オフライン'}
              </Text>
            </View>
          </View>

          {/* Footer */}
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
    backgroundColor: '#f5f5f5',
  },
  mainContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  restartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  version: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  modeButton: {
    padding: 20,
    borderRadius: 15,
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
    fontSize: 40,
    marginBottom: 10,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
  },
  buttonFeatures: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  featureText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 3,
  },
  statusBar: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
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
    marginBottom: 5,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
  },
  statusValue: {
    fontSize: 12,
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
  },
});