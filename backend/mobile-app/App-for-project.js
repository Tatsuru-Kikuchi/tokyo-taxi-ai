import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import CustomerScreen from './screens/CustomerScreen';  // 20K version
import DriverScreen from './screens/DriverScreen';      // 27K version

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
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
  };

  const handleBack = () => {
    setMode(null);
  };

  // Show the appropriate screen based on mode
  if (mode === 'customer') {
    return <CustomerScreen onBack={handleBack} />;
  }

  if (mode === 'driver') {
    return <DriverScreen onBack={handleBack} />;
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
          </View>

          <TouchableOpacity 
            style={[styles.modeButton, styles.customerButton]}
            onPress={() => handleModeSelect('customer')}
          >
            <Text style={styles.buttonIcon}>👤</Text>
            <Text style={styles.buttonTitle}>お客様として利用</Text>
            <Text style={styles.buttonSubtitle}>Customer Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.modeButton, styles.driverButton]}
            onPress={() => handleModeSelect('driver')}
          >
            <Text style={styles.buttonIcon}>🚗</Text>
            <Text style={styles.buttonTitle}>ドライバーとして利用</Text>
            <Text style={styles.buttonSubtitle}>Driver Mode</Text>
          </TouchableOpacity>

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              位置情報: {locationPermission ? '✅' : '❌'}
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
  header: {
    alignItems: 'center',
    marginBottom: 50,
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
    backgroundColor: '#2196F3',
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
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
});
