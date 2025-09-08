import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import CustomerScreen from './screens/CustomerScreen';
import DriverScreen from './screens/DriverScreen';

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

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
      <View style={[styles.mainContainer, isTablet && styles.mainContainerTablet]}>
        <View style={styles.header}>
          <Text style={[styles.logo, isTablet && styles.logoTablet]}>🚕</Text>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>全国AIタクシー</Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>AI技術で革新する配車サービス</Text>
        </View>

        <View style={[styles.featuresContainer, isTablet && styles.featuresContainerTablet]}>
          <Text style={[styles.featuresTitle, isTablet && styles.featuresTitleTablet]}>🆕 新機能</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🗺️</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>AI配車最適化</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💰</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>GOより¥1,380お得</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🚆</Text>
              <Text style={[styles.featureText, isTablet && styles.featureTextTablet]}>電車連携機能</Text>
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
            Version 3.0.1 (Build 108)
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
    marginBottom: 30,
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
  },
  subtitleTablet: {
    fontSize: 18,
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
  featuresContainerTablet: {
    padding: 25,
    borderRadius: 20,
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  featuresTitleTablet: {
    fontSize: 20,
    marginBottom: 15,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    width: '48%',
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  featureTextTablet: {
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonContainerTablet: {
    maxWidth: 600,
    alignSelf: 'center',
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
  modeButtonTablet: {
    padding: 35,
    borderRadius: 20,
    marginBottom: 25,
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
  buttonIconTablet: {
    fontSize: 50,
    marginBottom: 15,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  buttonTitleTablet: {
    fontSize: 24,
    marginBottom: 8,
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
    bottom: 30,
    alignSelf: 'center',
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
