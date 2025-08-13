import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import CustomerScreen from './screens/CustomerScreen';
import DriverScreen from './screens/DriverScreen';

const { width, height } = Dimensions.get('window');

// Configuration constants
const STORAGE_KEYS = {
  SELECTED_MODE: 'selectedMode',
  FIRST_LAUNCH: 'firstLaunch',
  LOCATION_PERMISSION: 'locationPermission',
  LINE_SUPPORT_USED: 'lineSupportUsed',
};

const LINE_OA_ID = '@dhai52765howdah';
const SUPPORT_EMAIL = 'support@zenkoku-ai-taxi.jp';
const DRIVER_PHONE = '050-1234-5678';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [error, setError] = useState(null);

  // Initialize app on startup
  useEffect(() => {
    initializeApp();
  }, []);

  // Simulate loading progress
  useEffect(() => {
    if (isLoading && loadingProgress < 100) {
      const timer = setTimeout(() => {
        setLoadingProgress(prev => Math.min(prev + 10, 100));
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingProgress]);

  const initializeApp = async () => {
    try {
      setLoadingProgress(10);

      // Check first launch
      const firstLaunch = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
      setIsFirstLaunch(firstLaunch === null);
      setLoadingProgress(30);

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      setLoadingProgress(60);

      // Save permission status
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, status);
      setLoadingProgress(80);

      // Check for saved mode
      const savedMode = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_MODE);
      setLoadingProgress(90);

      // Complete initialization
      setTimeout(() => {
        setLoadingProgress(100);
        setIsLoading(false);

        if (savedMode && hasLocationPermission) {
          setCurrentScreen(savedMode);
        } else {
          setCurrentScreen('roleSelection');
        }
      }, 500);

    } catch (error) {
      console.error('App initialization error:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // LINE Support Integration
  const openLINESupport = async () => {
    try {
      const lineURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
      const canOpen = await Linking.canOpenURL(lineURL);

      if (canOpen) {
        await Linking.openURL(lineURL);
        await AsyncStorage.setItem(STORAGE_KEYS.LINE_SUPPORT_USED, 'true');
      } else {
        // Fallback to browser
        const webURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
        await Linking.openURL(webURL);
      }
    } catch (error) {
      Alert.alert(
        'LINEサポート',
        `LINEアプリを開けませんでした。\n\nLINE ID: ${LINE_OA_ID}\n\nまたはメールでお問い合わせください: ${SUPPORT_EMAIL}`,
        [
          { text: 'LINE IDをコピー', onPress: () => copyLINEID() },
          { text: 'メールを開く', onPress: () => openEmailSupport() },
          { text: 'キャンセル', style: 'cancel' }
        ]
      );
    }
  };

  const copyLINEID = () => {
    // In a real app, you'd use Clipboard API
    Alert.alert('LINE ID', `${LINE_OA_ID}\n\nLINE IDがコピーされました`);
  };

  const openEmailSupport = async () => {
    try {
      const emailURL = `mailto:${SUPPORT_EMAIL}?subject=全国AIタクシー サポート&body=お困りのことをお書きください`;
      await Linking.openURL(emailURL);
    } catch (error) {
      Alert.alert('エラー', 'メールアプリを開けませんでした');
    }
  };

  const showSupportOptions = () => {
    Alert.alert(
      'サポート',
      'お困りのことがございましたら、以下の方法でお問い合わせください：',
      [
        { text: 'LINEサポート', onPress: openLINESupport },
        { text: 'メールサポート', onPress: openEmailSupport },
        { text: 'キャンセル', style: 'cancel' }
      ]
    );
  };

  // Handle role selection
  const handleRoleSelect = async (role) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_MODE, role);
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'false');
      setIsFirstLaunch(false);
      setCurrentScreen(role);
    } catch (error) {
      console.error('Error saving role selection:', error);
      setCurrentScreen(role); // Continue anyway
    }
  };

  // Handle mode switching
  const handleSwitchMode = async () => {
    try {
      const newMode = currentScreen === 'customer' ? 'driver' : 'customer';
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_MODE, newMode);
      setCurrentScreen(newMode);
    } catch (error) {
      console.error('Error switching mode:', error);
      // Continue with switch anyway
      const newMode = currentScreen === 'customer' ? 'driver' : 'customer';
      setCurrentScreen(newMode);
    }
  };

  // Return to role selection
  const returnToRoleSelection = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_MODE);
      setCurrentScreen('roleSelection');
    } catch (error) {
      console.error('Error returning to role selection:', error);
      setCurrentScreen('roleSelection'); // Continue anyway
    }
  };

  // Retry initialization
  const retryInitialization = () => {
    setError(null);
    setIsLoading(true);
    setLoadingProgress(0);
    initializeApp();
  };

  // Loading Screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
        <View style={styles.loadingContainer}>
          <Text style={styles.appTitle}>全国AIタクシー</Text>
          <Text style={styles.loadingSubtitle}>日本初の天気予測AI配車アプリ</Text>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${loadingProgress}%` }]} />
          </View>

          <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
          <Text style={styles.loadingText}>
            {loadingProgress < 30 ? 'アプリを初期化中...' :
             loadingProgress < 60 ? '位置情報を確認中...' :
             loadingProgress < 90 ? '設定を読み込み中...' : '準備完了!'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error Screen
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#ef4444" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>エラーが発生しました</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={retryInitialization}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportButton} onPress={showSupportOptions}>
            <Text style={styles.supportButtonText}>💬 サポートに連絡</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Role Selection Screen
  if (currentScreen === 'roleSelection') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
        <View style={styles.roleSelectionContainer}>
          <Text style={styles.welcomeTitle}>
            {isFirstLaunch ? 'ようこそ！' : 'おかえりなさい！'}
          </Text>
          <Text style={styles.appTitle}>全国AIタクシー</Text>
          <Text style={styles.subtitle}>ご利用方法を選択してください</Text>

          {!hasLocationPermission && (
            <View style={styles.permissionWarning}>
              <Text style={styles.permissionText}>
                ⚠️ 位置情報の許可が必要です
              </Text>
            </View>
          )}

          <View style={styles.rolesContainer}>
            <TouchableOpacity
              style={[styles.roleButton, styles.customerButton]}
              onPress={() => handleRoleSelect('customer')}
              disabled={!hasLocationPermission}
            >
              <Text style={styles.roleIcon}>🚕</Text>
              <Text style={styles.roleTitle}>お客様</Text>
              <Text style={styles.roleDescription}>
                タクシーを呼ぶ{'\n'}
                AI推奨ルートで快適移動
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, styles.driverButton]}
              onPress={() => handleRoleSelect('driver')}
              disabled={!hasLocationPermission}
            >
              <Text style={styles.roleIcon}>🚗</Text>
              <Text style={styles.roleTitle}>ドライバー</Text>
              <Text style={styles.roleDescription}>
                配車を受ける{'\n'}
                AI予測で収益最大化
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>🌟 特徴</Text>
            <Text style={styles.featureText}>🌦️ 天気予測AI搭載</Text>
            <Text style={styles.featureText}>🗾 全国8大都市対応</Text>
            <Text style={styles.featureText}>🚇 50+駅情報連携</Text>
          </View>

          <TouchableOpacity style={styles.lineSupportButton} onPress={showSupportOptions}>
            <Text style={styles.lineSupportText}>💬 サポート・お問い合わせ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Customer Screen
  if (currentScreen === 'customer') {
    return (
      <CustomerScreen
        onSwitchMode={handleSwitchMode}
        onBackToSelection={returnToRoleSelection}
        onShowSupport={showSupportOptions}
      />
    );
  }

  // Driver Screen
  if (currentScreen === 'driver') {
    return (
      <DriverScreen
        onSwitchMode={handleSwitchMode}
        onBackToSelection={returnToRoleSelection}
        onShowSupport={showSupportOptions}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    marginBottom: 40,
    textAlign: 'center',
  },
  progressContainer: {
    width: width * 0.8,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 30,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#fee2e2',
    marginBottom: 30,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  retryButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  supportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  roleSelectionContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  permissionText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
  rolesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  roleButton: {
    flex: 1,
    padding: 20,
    borderRadius: 15,
    marginHorizontal: 10,
    alignItems: 'center',
    minHeight: 150,
    justifyContent: 'center',
  },
  customerButton: {
    backgroundColor: '#10b981',
  },
  driverButton: {
    backgroundColor: '#f59e0b',
  },
  roleIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
  },
  featuresContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#e0e7ff',
    marginBottom: 8,
    textAlign: 'center',
  },
  lineSupportButton: {
    backgroundColor: '#00C300',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  lineSupportText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
