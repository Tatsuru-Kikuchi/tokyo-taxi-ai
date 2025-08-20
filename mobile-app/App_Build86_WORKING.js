/******************************************
 * FILE: App.js
 * VERSION: Build 86 (Production)
 * STATUS: ✅ WORKING - TestFlight Approved
 * 
 * CRITICAL NOTES:
 * - Navigation works perfectly
 * - Back button issue FIXED
 * - Mode switching works
 * - NO crashes
 * 
 * DEPENDENCIES:
 * - Expo SDK: 51.0.0 (DO NOT CHANGE)
 * - React Native: 0.74.5 (DO NOT CHANGE)
 * - Node: 18.20.0 (DO NOT CHANGE)
 * 
 * LAST TESTED: 2024-12-20
 * NEVER ADD: react-native-maps imports
 ******************************************/

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
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

  const handleSwitchMode = () => {
    console.log('Switching mode from', mode, 'to', mode === 'customer' ? 'driver' : 'customer');
    setMode(mode === 'customer' ? 'driver' : 'customer');
  };

  const handleBackToSelection = () => {
    console.log('Going back to main menu from', mode);
    setMode(null);
  };

  if (mode === 'customer') {
    return (
      <CustomerScreen 
        onSwitchMode={handleSwitchMode}
        onBackToSelection={handleBackToSelection}
      />
    );
  }

  if (mode === 'driver') {
    return (
      <DriverScreen 
        onSwitchMode={handleSwitchMode}
        onBackToSelection={handleBackToSelection}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>🚕</Text>
          <Text style={styles.title}>全国AIタクシー</Text>
          <Text style={styles.subtitle}>AI技術で革新する配車サービス</Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>🆕 新機能</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🗺️</Text>
            <Text style={styles.featureText}>AI配車最適化</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>💰</Text>
            <Text style={styles.featureText}>GOより¥1,380お得</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🚆</Text>
            <Text style={styles.featureText}>電車連携機能</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>📈</Text>
            <Text style={styles.featureText}>収益85%保証</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.modeButton, styles.customerButton]}
          onPress={() => handleModeSelect('customer')}
        >
          <Text style={styles.buttonIcon}>👤</Text>
          <Text style={styles.buttonTitle}>お客様として利用</Text>
          <Text style={styles.buttonSubtitle}>配車をリクエスト</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modeButton, styles.driverButton]}
          onPress={() => handleModeSelect('driver')}
        >
          <Text style={styles.buttonIcon}>🚗</Text>
          <Text style={styles.buttonTitle}>ドライバーとして利用</Text>
          <Text style={styles.buttonSubtitle}>収益を最大化</Text>
        </TouchableOpacity>

        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            位置情報: {locationPermission ? '✅ 許可済み' : '❌ 未許可'}
          </Text>
          <Text style={styles.versionText}>Version 3.0.0 (Build 86)</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
  },
  featuresContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
  },
  modeButton: {
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  customerButton: {
    backgroundColor: '#4CAF50',
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
  },
  statusBar: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  versionText: {
    fontSize: 10,
    color: '#999',
  },
});
