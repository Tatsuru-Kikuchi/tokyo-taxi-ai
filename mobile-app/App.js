import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CustomerScreen from './screens/CustomerScreen';
import DriverScreen from './screens/DriverScreen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function App() {
  const [mode, setMode] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await requestLocationPermission();
    setIsLoading(false);
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          '位置情報の許可が必要です',
          'タクシー配車には位置情報が必要です。設定から許可してください。'
        );
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const handleModeSelect = (selectedMode) => {
    console.log('Mode selected:', selectedMode);
    setMode(selectedMode);
  };

  const handleModeChange = (newMode) => {
    console.log('Changing mode to:', newMode);
    setMode(newMode);
  };

  const handleBackToSelection = () => {
    console.log('Going back to main menu from', mode);
    setMode(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>準備中...</Text>
      </SafeAreaView>
    );
  }

  if (mode === 'customer') {
    return (
      <CustomerScreen
        onModeChange={handleModeChange}
        onBack={handleBackToSelection}
      />
    );
  }

  if (mode === 'driver') {
    return (
      <DriverScreen
        onModeChange={handleModeChange}
        onBack={handleBackToSelection}
      />
    );
  }

  // Main selection screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.mainContainer, isTablet && styles.mainContainerTablet]}>
        <View style={styles.header}>
          <Text style={[styles.logo, isTablet && styles.logoTablet]}>🚕</Text>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>全国AIタクシー</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            全国8,600駅対応・天気予報連動配車
          </Text>
        </View>

        <View style={[styles.featuresContainer, isTablet && styles.featuresContainerTablet]}>
          <Text style={[styles.featuresTitle, isTablet && styles.featuresTitleTablet]}>🆕 新機能</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🌧️</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>雨予報で自動配車</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💰</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>GOより¥1,380お得</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🚉</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>全国8,600駅対応</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📈</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>収益85%保証</Text>
            </View>
          </View>
        </View>

        <View style={[styles.buttonContainer, isTablet && styles.buttonContainerTablet]}>
          <TouchableOpacity
            style={[styles.modeButton, styles.customerButton, isTablet && styles.modeButtonTablet]}
            onPress={() => handleModeSelect('customer')}
          >
            <Text style={[styles.buttonIcon, isTablet && styles.buttonIconTablet]}>👤</Text>
            <Text style={[styles.buttonTitle, isTablet && styles.buttonTitleTablet]}>お客様として利用</Text>
            <Text style={[styles.buttonSubtitle, isTablet && styles.buttonSubtitleTablet]}>配車をリクエスト</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, styles.driverButton, isTablet && styles.modeButtonTablet]}
            onPress={() => handleModeSelect('driver')}
          >
            <Text style={[styles.buttonIcon, isTablet && styles.buttonIconTablet]}>🚗</Text>
            <Text style={[styles.buttonTitle, isTablet && styles.buttonTitleTablet]}>ドライバーとして利用</Text>
            <Text style={[styles.buttonSubtitle, isTablet && styles.buttonSubtitleTablet]}>収益を最大化</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusBar}>
          <Text style={[styles.statusText, isTablet && styles.statusTextTablet]}>
            位置情報: {locationPermission ? '✅ 許可済み' : '❌ 未許可'}
          </Text>
          <Text style={[styles.versionText, isTablet && styles.versionTextTablet]}>
            Version 3.1.0 (Build 120)
          </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainContainerTablet: {
    padding: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  logoTablet: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  titleTablet: {
    fontSize: 36,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  subtitleTablet: {
    fontSize: 18,
  },
  featuresContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  featuresContainerTablet: {
    maxWidth: 600,
    padding: 30,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  featuresTitleTablet: {
    fontSize: 20,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureEmoji: {
    fontSize: 30,
    marginBottom: 5,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  featureTextTablet: {
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
  },
  buttonContainerTablet: {
    maxWidth: 600,
  },
  modeButton: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modeButtonTablet: {
    padding: 30,
  },
  customerButton: {
    backgroundColor: '#FFD700',
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
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statusTextTablet: {
    fontSize: 14,
  },
  versionText: {
    fontSize: 10,
    color: '#999',
  },
  versionTextTablet: {
    fontSize: 12,
  },
});
