/******************************************
 * FILE: App.js
 * VERSION: Build 120 (Production Ready)
 * STATUS: 🎯 READY FOR SUBMISSION
 *
 * CRITICAL NOTES:
 * - Integrates with working backend services
 * - Fixed JAGeocoder distance calculations
 * - iPad compatibility maintained
 * - No react-native-maps (stable)
 * - Enhanced error handling
 *
 * BACKEND SERVICES:
 * - Main API: tokyo-taxi-ai-production (8604 stations)
 * - JAGeocoder: tokyo-taxi-jageocoder-production (distance calc)
 * - Service status monitoring
 *
 * DEPENDENCIES:
 * - Expo SDK: 51.0.0 (DO NOT CHANGE)
 * - React Native: 0.74.5 (DO NOT CHANGE)
 * - Node: 18.20.0 (DO NOT CHANGE)
 *
 * LAST UPDATED: December 21, 2024
 ******************************************/

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import CustomerScreen from './screens/CustomerScreen';
import DriverScreen from './screens/DriverScreen';

// Backend service URLs
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const JAGEOCODER_URL = 'https://tokyo-taxi-jageocoder-production.up.railway.app';

if (Constants.manifest?.extra?.mapboxAccessToken) {
  Mapbox.setAccessToken(Constants.manifest.extra.mapboxAccessToken);
} else {
  console.warn("Mapbox Access Token not found in app.config.js 'extra' section.");
}

export default function App() {
  const [mode, setMode] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ main: false, jageocoder: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if device is tablet
      const { width, height } = Dimensions.get('window');
      const aspectRatio = Math.max(width, height) / Math.min(width, height);
      setIsTablet(aspectRatio < 1.6);

      // Request location permission
      await requestLocationPermission();

      // Check backend services
      await checkBackendServices();

    } catch (error) {
      console.log('App initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          '位置情報の許可が必要です',
          'タクシー配車には位置情報が必要です。設定から許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '設定を開く',
              onPress: () => {
                // In a real app, you'd open device settings
                console.log('Would open device settings');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.log('Location permission error:', error);
      setLocationPermission(false);
    }
  };

  const checkBackendServices = async () => {
    const status = { main: false, jageocoder: false };

    try {
      // Check main backend (8604 stations)
      const mainResponse = await fetch(`${BACKEND_URL}/api/health`, {
        timeout: 5000
      });
      status.main = mainResponse.ok;
    } catch (error) {
      console.log('Main backend check failed:', error);
    }

    try {
      // Check JAGeocoder service (distance calculations)
      const jageocoderResponse = await fetch(`${JAGEOCODER_URL}/health`, {
        timeout: 5000
      });
      status.jageocoder = jageocoderResponse.ok;
    } catch (error) {
      console.log('JAGeocoder service check failed:', error);
    }

    setBackendStatus(status);
  };

  const handleModeSelect = (selectedMode) => {
    console.log(`Mode selected: ${selectedMode}`);
    setMode(selectedMode);
  };

  const handleModeChange = () => {
    const newMode = mode === 'customer' ? 'driver' : 'customer';
    console.log(`Switching mode from ${mode} to ${newMode}`);
    setMode(newMode);
  };

  const handleBackToSelection = () => {
    console.log(`Going back to main menu from ${mode}`);
    setMode(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>全国AIタクシー起動中...</Text>
        <Text style={styles.loadingSubtext}>サービス接続確認中</Text>
      </SafeAreaView>
    );
  }

  // Customer mode screen
  if (mode === 'customer') {
    return (
      <CustomerScreen
        onModeChange={handleModeChange}
        onBack={handleBackToSelection}
        backendStatus={backendStatus}
        locationPermission={locationPermission}
      />
    );
  }

  // Driver mode screen
  if (mode === 'driver') {
    return (
      <DriverScreen
        onModeChange={handleModeChange}
        onBack={handleBackToSelection}
        backendStatus={backendStatus}
        locationPermission={locationPermission}
      />
    );
  }

  // Main selection screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={[styles.mainContainer, isTablet && styles.mainContainerTablet]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, isTablet && styles.logoTablet]}>🚕</Text>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>全国AIタクシー</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            全国8,604駅対応・天気予報連動配車
          </Text>
        </View>

        {/* Service Status Indicator */}
        <View style={styles.statusIndicator}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: backendStatus.main ? '#4CAF50' : '#FF5722' }]} />
              <Text style={styles.statusLabel}>駅データ</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: backendStatus.jageocoder ? '#4CAF50' : '#FF5722' }]} />
              <Text style={styles.statusLabel}>距離計算</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: locationPermission ? '#4CAF50' : '#FF9800' }]} />
              <Text style={styles.statusLabel}>位置情報</Text>
            </View>
          </View>
        </View>

        {/* Features Container */}
        <View style={[styles.featuresContainer, isTablet && styles.featuresContainerTablet]}>
          <Text style={[styles.featuresTitle, isTablet && styles.featuresTitleTablet]}>🆕 主な機能</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🌧️</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>雨予報で自動配車</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💳</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>キャッシュレス決済</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🚆</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>電車連携機能</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📍</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>全国8,604駅対応</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💰</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>GOより¥1,380お得</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📈</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>収益85%保証</Text>
            </View>
          </View>
        </View>

        {/* Mode Selection Buttons */}
        <View style={[styles.buttonContainer, isTablet && styles.buttonContainerTablet]}>
          <TouchableOpacity
            style={[styles.modeButton, styles.customerButton, isTablet && styles.modeButtonTablet]}
            onPress={() => handleModeSelect('customer')}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonIcon, isTablet && styles.buttonIconTablet]}>👤</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonTitle, isTablet && styles.buttonTitleTablet]}>
                お客様として利用
              </Text>
              <Text style={[styles.buttonSubtitle, isTablet && styles.buttonSubtitleTablet]}>
                配車をリクエスト
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, styles.driverButton, isTablet && styles.modeButtonTablet]}
            onPress={() => handleModeSelect('driver')}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonIcon, isTablet && styles.buttonIconTablet]}>🚗</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonTitle, isTablet && styles.buttonTitleTablet]}>
                ドライバーとして利用
              </Text>
              <Text style={[styles.buttonSubtitle, isTablet && styles.buttonSubtitleTablet]}>
                収益を最大化
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusText, isTablet && styles.statusTextTablet]}>
              サービス状態: {backendStatus.main && backendStatus.jageocoder ? '🟢 正常稼働中' : '🟡 一部制限あり'}
            </Text>
            <Text style={[styles.versionText, isTablet && styles.versionTextTablet]}>
              Version 3.0.1 (Build 120) - {Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  mainContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  mainContainerTablet: {
    paddingHorizontal: 60,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  logoTablet: {
    fontSize: 80,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  titleTablet: {
    fontSize: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  subtitleTablet: {
    fontSize: 18,
  },
  statusIndicator: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 10,
    color: '#666',
  },
  featuresContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresContainerTablet: {
    padding: 20,
    marginBottom: 30,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  featuresTitleTablet: {
    fontSize: 20,
    marginBottom: 16,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginVertical: 4,
  },
  featureEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#555',
    flex: 1,
  },
  featureTextTablet: {
    fontSize: 14,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  buttonContainerTablet: {
    marginBottom: 30,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modeButtonTablet: {
    padding: 25,
    marginBottom: 20,
  },
  customerButton: {
    backgroundColor: '#4CAF50',
  },
  driverButton: {
    backgroundColor: '#ff6b6b',
  },
  buttonIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  buttonIconTablet: {
    fontSize: 40,
    marginRight: 20,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  buttonTitleTablet: {
    fontSize: 22,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  buttonSubtitleTablet: {
    fontSize: 16,
  },
  statusBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusTextContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusTextTablet: {
    fontSize: 14,
  },
  versionText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  versionTextTablet: {
    fontSize: 12,
  },
});
