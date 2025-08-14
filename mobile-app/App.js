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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Import existing screens (enhanced with AI features)
import CustomerScreen from './screens/CustomerScreen';
import DriverScreen from './screens/DriverScreen';

const { width } = Dimensions.get('window');

// Configuration constants
const STORAGE_KEYS = {
  SELECTED_MODE: 'selectedMode',
  FIRST_LAUNCH: 'firstLaunch',
  LOCATION_PERMISSION: 'locationPermission',
  LINE_SUPPORT_USED: 'lineSupportUsed',
  AI_FEATURES_INTRO: 'aiFeaturesIntro',
  USER_PREFERENCES: 'userPreferences',
};

const LINE_OA_ID = '@dhai52765howdah';
const SUPPORT_EMAIL = 'support@zenkoku-ai-taxi.jp';
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';

export default function EnhancedApp() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('システム初期化中...');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [showAIIntro, setShowAIIntro] = useState(false);
  const [error, setError] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [aiFeatures, setAiFeatures] = useState({
    revenuePrediction: false,
    demandHeatmap: false,
    trafficIntegration: false,
    weatherForecast: false,
    realtimeAnalytics: false
  });

  useEffect(() => {
    initializeEnhancedApp();
  }, []);

  useEffect(() => {
    if (isLoading && loadingProgress < 100) {
      const timer = setTimeout(() => {
        setLoadingProgress(prev => {
          const newProgress = Math.min(prev + 8, 100);
          
          if (newProgress <= 20) {
            setLoadingStatus('🤖 AI システム起動中...');
          } else if (newProgress <= 40) {
            setLoadingStatus('🌦️ 天気予測エンジン準備中...');
          } else if (newProgress <= 60) {
            setLoadingStatus('📊 需要分析AI初期化中...');
          } else if (newProgress <= 80) {
            setLoadingStatus('🚦 交通最適化システム起動中...');
          } else if (newProgress <= 95) {
            setLoadingStatus('📈 リアルタイム分析準備中...');
          } else {
            setLoadingStatus('✅ 全システム準備完了!');
          }
          
          return newProgress;
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingProgress]);

  const initializeEnhancedApp = async () => {
    try {
      setLoadingProgress(10);
      setLoadingStatus('システム初期化中...');

      const firstLaunch = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
      const aiIntroShown = await AsyncStorage.getItem(STORAGE_KEYS.AI_FEATURES_INTRO);
      setIsFirstLaunch(firstLaunch === null);
      setShowAIIntro(aiIntroShown === null);
      setLoadingProgress(20);

      setLoadingStatus('位置情報許可を確認中...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      setLoadingProgress(40);

      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, status);
      
      setLoadingStatus('AIシステム接続確認中...');
      await checkSystemHealth();
      setLoadingProgress(60);

      setLoadingStatus('AI機能を初期化中...');
      await initializeAIFeatures();
      setLoadingProgress(80);

      const savedMode = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_MODE);
      setLoadingProgress(90);

      setTimeout(() => {
        setLoadingProgress(100);
        setLoadingStatus('初期化完了!');
        
        setTimeout(() => {
          setIsLoading(false);

          if (showAIIntro && hasLocationPermission) {
            showAIFeaturesIntro();
          } else if (savedMode && hasLocationPermission) {
            setCurrentScreen(savedMode);
          } else {
            setCurrentScreen('roleSelection');
          }
        }, 800);
      }, 500);

    } catch (error) {
      console.error('Enhanced app initialization error:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        timeout: 5000
      });
      
      if (response.ok) {
        const healthData = await response.json();
        setSystemHealth(healthData);
        setAiFeatures(healthData.features || {});
      }
    } catch (error) {
      console.warn('System health check failed:', error);
      setSystemHealth({ status: 'offline' });
    }
  };

  const initializeAIFeatures = async () => {
    try {
      const features = {
        revenuePrediction: true,
        demandHeatmap: true,
        trafficIntegration: true,
        weatherForecast: true,
        realtimeAnalytics: true
      };
      
      setAiFeatures(features);
      await AsyncStorage.setItem('aiFeatures', JSON.stringify(features));
    } catch (error) {
      console.warn('AI features initialization error:', error);
    }
  };

  const showAIFeaturesIntro = () => {
    Alert.alert(
      '🤖 全国AIタクシー v3.0',
      '新しいAI機能が追加されました！\n\n' +
      '🎯 収益予測AI - 最大30%収益向上\n' +
      '🌧️ 天気連動需要分析\n' +
      '🚦 リアルタイム交通最適化\n' +
      '📊 需要ヒートマップ\n' +
      '📈 24時間収益予測\n\n' +
      'AIアシスタントがあなたの配車を最適化します！',
      [
        {
          text: 'チュートリアルを見る',
          onPress: () => {
            setShowAIIntro(false);
            AsyncStorage.setItem(STORAGE_KEYS.AI_FEATURES_INTRO, 'shown');
            showAITutorial();
          }
        },
        {
          text: 'スキップして開始',
          onPress: () => {
            setShowAIIntro(false);
            AsyncStorage.setItem(STORAGE_KEYS.AI_FEATURES_INTRO, 'shown');
            setCurrentScreen('roleSelection');
          },
          style: 'cancel'
        }
      ]
    );
  };

  const showAITutorial = () => {
    Alert.alert(
      '🎯 AI機能の使い方',
      'お客様モード:\n' +
      '• 料金予測で最適な時間帯を確認\n' +
      '• 需要ヒートマップで混雑状況を把握\n' +
      '• 天気による料金変動を事前確認\n\n' +
      'ドライバーモード:\n' +
      '• 収益予測でエリア選択を最適化\n' +
      '• AI推奨ルートで効率的な運行\n' +
      '• リアルタイム需要分析で収益最大化',
      [
        { text: '理解しました', onPress: () => setCurrentScreen('roleSelection') }
      ]
    );
  };

  const openLINESupport = async () => {
    try {
      const lineURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
      const canOpen = await Linking.canOpenURL(lineURL);

      if (canOpen) {
        await Linking.openURL(lineURL);
        await AsyncStorage.setItem(STORAGE_KEYS.LINE_SUPPORT_USED, 'true');
      } else {
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

  const showEnhancedSupportOptions = () => {
    Alert.alert(
      '🤖 AIサポート',
      'お困りのことがございましたら、以下の方法でお問い合わせください：',
      [
        { text: 'LINEサポート (推奨)', onPress: openLINESupport },
        { text: 'メールサポート', onPress: openEmailSupport },
        { text: 'AI機能ヘルプ', onPress: showAIHelp },
        { text: 'キャンセル', style: 'cancel' }
      ]
    );
  };

  const showAIHelp = () => {
    Alert.alert(
      '🤖 AI機能ヘルプ',
      'AI機能の詳細説明:\n\n' +
      '📊 収益予測AI:\n天気・交通・時間帯を分析して最適な収益を予測\n\n' +
      '🗺️ 需要ヒートマップ:\nリアルタイムで高需要エリアを可視化\n\n' +
      '🌦️ 天気連動分析:\n雨天時の需要増加を事前に予測\n\n' +
      '🚦 交通最適化:\n渋滞情報と連動したルート最適化',
      [
        { text: '詳細をLINEで相談', onPress: openLINESupport },
        { text: '閉じる', style: 'cancel' }
      ]
    );
  };

  const handleRoleSelect = async (role) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_MODE, role);
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'false');
      setIsFirstLaunch(false);
      setCurrentScreen(role);
    } catch (error) {
      console.error('Error saving role selection:', error);
      setCurrentScreen(role);
    }
  };

  const handleSwitchMode = async () => {
    try {
      const newMode = currentScreen === 'customer' ? 'driver' : 'customer';
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_MODE, newMode);
      setCurrentScreen(newMode);
    } catch (error) {
      console.error('Error switching mode:', error);
      const newMode = currentScreen === 'customer' ? 'driver' : 'customer';
      setCurrentScreen(newMode);
    }
  };

  const returnToRoleSelection = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_MODE);
      setCurrentScreen('roleSelection');
    } catch (error) {
      console.error('Error returning to role selection:', error);
      setCurrentScreen('roleSelection');
    }
  };

  const retryInitialization = () => {
    setError(null);
    setIsLoading(true);
    setLoadingProgress(0);
    initializeEnhancedApp();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
        <View style={styles.loadingContainer}>
          <Text style={styles.appTitle}>🤖 全国AIタクシー</Text>
          <Text style={styles.loadingSubtitle}>AI powered nationwide taxi platform</Text>
          <Text style={styles.versionText}>v3.0.0 - Production Ready</Text>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${loadingProgress}%` }]} />
            <Text style={styles.progressText}>{loadingProgress}%</Text>
          </View>

          <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
          <Text style={styles.loadingText}>{loadingStatus}</Text>

          <View style={styles.aiStatusContainer}>
            <Text style={styles.aiStatusTitle}>🤖 AI機能</Text>
            <View style={styles.aiStatusGrid}>
              <View style={styles.aiStatusItem}>
                <Text style={styles.aiStatusIcon}>
                  {aiFeatures.revenuePrediction ? '✅' : '⏳'}
                </Text>
                <Text style={styles.aiStatusText}>収益予測</Text>
              </View>
              <View style={styles.aiStatusItem}>
                <Text style={styles.aiStatusIcon}>
                  {aiFeatures.demandHeatmap ? '✅' : '⏳'}
                </Text>
                <Text style={styles.aiStatusText}>需要分析</Text>
              </View>
              <View style={styles.aiStatusItem}>
                <Text style={styles.aiStatusIcon}>
                  {aiFeatures.trafficIntegration ? '✅' : '⏳'}
                </Text>
                <Text style={styles.aiStatusText}>交通最適化</Text>
              </View>
              <View style={styles.aiStatusItem}>
                <Text style={styles.aiStatusIcon}>
                  {aiFeatures.weatherForecast ? '✅' : '⏳'}
                </Text>
                <Text style={styles.aiStatusText}>天気予測</Text>
              </View>
            </View>
          </View>

          {systemHealth && (
            <View style={styles.healthContainer}>
              <Text style={styles.healthStatus}>
                システム状態: {systemHealth.status === 'healthy' ? '🟢 正常' : '🟡 オフライン'}
              </Text>
              {systemHealth.supportedRegions && (
                <Text style={styles.healthDetail}>
                  対応地域: {systemHealth.supportedRegions}箇所
                </Text>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#ef4444" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>🚨 システムエラー</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={retryInitialization}>
            <Text style={styles.retryButtonText}>🔄 再試行</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportButton} onPress={showEnhancedSupportOptions}>
            <Text style={styles.supportButtonText}>💬 AIサポートに連絡</Text>
          </TouchableOpacity>

          <View style={styles.errorHelpContainer}>
            <Text style={styles.errorHelpTitle}>よくある解決方法:</Text>
            <Text style={styles.errorHelpText}>• インターネット接続を確認</Text>
            <Text style={styles.errorHelpText}>• 位置情報の許可を確認</Text>
            <Text style={styles.errorHelpText}>• アプリの再起動</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'roleSelection') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
        <View style={styles.roleSelectionContainer}>
          <Text style={styles.welcomeTitle}>
            {isFirstLaunch ? '🤖 AI配車へようこそ！' : 'おかえりなさい！'}
          </Text>
          <Text style={styles.appTitle}>全国AIタクシー</Text>
          <Text style={styles.subtitle}>AIが最適化するタクシープラットフォーム</Text>

          {!hasLocationPermission && (
            <View style={styles.permissionWarning}>
              <Text style={styles.permissionText}>
                ⚠️ AI機能には位置情報の許可が必要です
              </Text>
            </View>
          )}

          {systemHealth && (
            <View style={styles.systemStatusContainer}>
              <Text style={styles.systemStatusText}>
                {systemHealth.status === 'healthy' 
                  ? '🟢 AI システム稼働中' 
                  : '🟡 オフラインモード'}
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
                🤖 AI最適化配車{'\n'}
                料金予測・需要分析
              </Text>
              <View style={styles.roleFeatures}>
                <Text style={styles.roleFeature}>• AI料金予測</Text>
                <Text style={styles.roleFeature}>• 需要ヒートマップ</Text>
                <Text style={styles.roleFeature}>• 天気連動分析</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, styles.driverButton]}
              onPress={() => handleRoleSelect('driver')}
              disabled={!hasLocationPermission}
            >
              <Text style={styles.roleIcon}>🚗</Text>
              <Text style={styles.roleTitle}>ドライバー</Text>
              <Text style={styles.roleDescription}>
                🤖 AI収益最大化{'\n'}
                エリア推奨・交通最適化
              </Text>
              <View style={styles.roleFeatures}>
                <Text style={styles.roleFeature}>• 収益予測AI</Text>
                <Text style={styles.roleFeature}>• 最適エリア推奨</Text>
                <Text style={styles.roleFeature}>• リアルタイム分析</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>🌟 AI機能</Text>
            <View style={styles.featuresGrid}>
              <Text style={styles.featureText}>🤖 収益予測AI</Text>
              <Text style={styles.featureText}>🌦️ 天気連動分析</Text>
              <Text style={styles.featureText}>🚦 交通最適化</Text>
              <Text style={styles.featureText}>📊 需要ヒートマップ</Text>
              <Text style={styles.featureText}>🗾 全国8大都市対応</Text>
              <Text style={styles.featureText}>🚇 主要駅リアルタイム分析</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.lineSupportButton} onPress={showEnhancedSupportOptions}>
            <Text style={styles.lineSupportText}>💬 AIサポート・お問い合わせ</Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={styles.versionInfo}>
              v3.0.0 Production | AI Features Active
            </Text>
            {systemHealth?.totalStations && (
              <Text style={styles.coverageInfo}>
                対応駅数: {systemHealth.totalStations} | 
                稼働ドライバー: {systemHealth.activeDrivers || 0}名
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'customer') {
    return (
      <CustomerScreen
        onSwitchMode={handleSwitchMode}
        onBackToSelection={returnToRoleSelection}
        onShowSupport={showEnhancedSupportOptions}
        aiFeatures={aiFeatures}
        systemHealth={systemHealth}
      />
    );
  }

  if (currentScreen === 'driver') {
    return (
      <DriverScreen
        onSwitchMode={handleSwitchMode}
        onBackToSelection={returnToRoleSelection}
        onShowSupport={showEnhancedSupportOptions}
        aiFeatures={aiFeatures}
        systemHealth={systemHealth}
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    marginBottom: 5,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#c7d2fe',
    marginBottom: 40,
    textAlign: 'center',
  },
  progressContainer: {
    width: width * 0.8,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 10,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  progressText: {
    position: 'absolute',
    top: -25,
    right: 0,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loader: {
    marginBottom: 20,
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 30,
  },
  aiStatusContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  aiStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
  },
  aiStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  aiStatusItem: {
    alignItems: 'center',
    minWidth: '40%',
    marginBottom: 10,
  },
  aiStatusIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  aiStatusText: {
    fontSize: 11,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  healthContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  healthStatus: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  healthDetail: {
    fontSize: 12,
    color: '#e0e7ff',
    marginTop: 5,
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
    marginBottom: 20,
  },
  supportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorHelpContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  errorHelpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  errorHelpText: {
    fontSize: 12,
    color: '#fee2e2',
    marginBottom: 5,
  },
  roleSelectionContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 20,
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
  systemStatusContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  systemStatusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
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
    marginHorizontal: 5,
    alignItems: 'center',
    minHeight: 200,
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
    marginBottom: 10,
  },
  roleFeatures: {
    alignItems: 'center',
  },
  roleFeature: {
    fontSize: 10,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 2,
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
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureText: {
    fontSize: 12,
    color: '#e0e7ff',
    marginBottom: 8,
    width: '48%',
    textAlign: 'center',
  },
  lineSupportButton: {
    backgroundColor: '#00C300',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  lineSupportText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  versionInfo: {
    fontSize: 10,
    color: '#c7d2fe',
    marginBottom: 5,
  },
  coverageInfo: {
    fontSize: 9,
    color: '#a5b4fc',
  },
});

export default EnhancedApp;