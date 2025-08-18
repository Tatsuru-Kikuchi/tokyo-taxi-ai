import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Error Boundary Component
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
            style={styles.retryButton}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onRetry) {
                this.props.onRetry();
              }
            }}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Simplified Customer Screen (Fallback)
const CustomerScreenSimple = ({ onSwitchMode, onBackToSelection }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>お客様モード</Text>
          <Text style={styles.subtitle}>全国AIタクシー</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📍 現在地</Text>
          <Text style={styles.infoText}>
            {location ? '位置情報取得済み' : '位置情報なし'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🚕 利用可能なタクシー</Text>
          <Text style={styles.infoText}>周辺で5台が待機中</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => {
          Alert.alert('配車リクエスト', 'タクシーを呼びますか？', [
            { text: 'キャンセル', style: 'cancel' },
            { text: '呼ぶ', onPress: () => Alert.alert('成功', '配車リクエストを送信しました') }
          ]);
        }}>
          <Text style={styles.primaryButtonText}>タクシーを呼ぶ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchMode}>
          <Text style={styles.secondaryButtonText}>ドライバーモードへ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Simplified Driver Screen (Fallback)
const DriverScreenSimple = ({ onSwitchMode, onBackToSelection }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: '#ff6b6b' }]}>
          <Text style={styles.title}>ドライバーモード</Text>
          <Text style={styles.subtitle}>全国AIタクシー</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📊 本日の収益</Text>
          <Text style={styles.earningsText}>¥{earnings.toLocaleString()}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🚗 運行状態</Text>
          <TouchableOpacity 
            style={[styles.statusButton, { backgroundColor: isOnline ? '#4CAF50' : '#999' }]}
            onPress={() => {
              setIsOnline(!isOnline);
              Alert.alert('状態変更', isOnline ? 'オフラインになりました' : 'オンラインになりました');
            }}
          >
            <Text style={styles.statusButtonText}>
              {isOnline ? 'オンライン' : 'オフライン'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchMode}>
          <Text style={styles.secondaryButtonText}>お客様モードへ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Main App Component
export default function App() {
  const [mode, setMode] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [CustomerScreen, setCustomerScreen] = useState(null);
  const [DriverScreen, setDriverScreen] = useState(null);
  const [screenLoadError, setScreenLoadError] = useState(false);

  useEffect(() => {
    requestLocationPermission();
    loadScreens();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const loadScreens = async () => {
    try {
      // Try to load the full-featured screens
      const customerModule = require('./screens/CustomerScreen');
      const driverModule = require('./screens/DriverScreen');
      
      setCustomerScreen(() => customerModule.default || customerModule);
      setDriverScreen(() => driverModule.default || driverModule);
    } catch (error) {
      console.error('Failed to load screens:', error);
      setScreenLoadError(true);
      // Use simplified screens as fallback
      setCustomerScreen(() => CustomerScreenSimple);
      setDriverScreen(() => DriverScreenSimple);
    }
  };

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
  };

  const handleSwitchMode = () => {
    setMode(mode === 'customer' ? 'driver' : 'customer');
  };

  const handleBackToSelection = () => {
    setMode(null);
  };

  const handleRetry = () => {
    setMode(null);
    loadScreens();
  };

  // Show the appropriate screen based on mode
  if (mode === 'customer') {
    const Screen = CustomerScreen || CustomerScreenSimple;
    return (
      <ErrorBoundary onRetry={handleRetry}>
        <Screen 
          onSwitchMode={handleSwitchMode}
          onBackToSelection={handleBackToSelection}
        />
      </ErrorBoundary>
    );
  }

  if (mode === 'driver') {
    const Screen = DriverScreen || DriverScreenSimple;
    return (
      <ErrorBoundary onRetry={handleRetry}>
        <Screen 
          onSwitchMode={handleSwitchMode}
          onBackToSelection={handleBackToSelection}
        />
      </ErrorBoundary>
    );
  }

  // Main selection screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>🚕</Text>
          <Text style={styles.mainTitle}>全国AIタクシー</Text>
          <Text style={styles.mainSubtitle}>AI技術で革新する配車サービス</Text>
          <Text style={styles.version}>Version 3.0.0 (Build 69)</Text>
          {screenLoadError && (
            <Text style={styles.warningText}>
              ⚠️ 簡易モードで実行中
            </Text>
          )}
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

        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>位置情報:</Text>
            <Text style={[styles.statusValue, { color: locationPermission ? '#4CAF50' : '#ff6b6b' }]}>
              {locationPermission ? '✓ 許可済み' : '✗ 未許可'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>サーバー:</Text>
            <Text style={[styles.statusValue, { color: '#4CAF50' }]}>
              ✓ 接続中
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>全国47都道府県対応予定</Text>
        </View>
      </View>
    </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 15,
  },
  logo: {
    fontSize: 70,
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',  // Changed to purple for better visibility
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mainSubtitle: {
    fontSize: 16,
    color: '#764ba2',  // Changed to darker purple for better visibility
    marginBottom: 5,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  version: {
    fontSize: 13,
    color: '#667eea',  // Changed to purple for better visibility
    fontStyle: 'italic',
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#ff9800',
    marginTop: 5,
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
    alignItems: 'center',
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
    fontSize: 14,
    color: '#444',  // Darker color for better visibility
    marginRight: 5,
    fontWeight: '600',
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
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
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  earningsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});