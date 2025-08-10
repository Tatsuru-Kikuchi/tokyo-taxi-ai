// Main App with Role Selection
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DriverScreen from './screens/DriverScreen';
import CustomerScreen from './screens/CustomerScreen';

export default function App() {
  const [userMode, setUserMode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserMode();
  }, []);

  const loadUserMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('userMode');
      if (savedMode) {
        setUserMode(savedMode);
      }
    } catch (error) {
      console.error('Error loading user mode:', error);
    }
    setLoading(false);
  };

  const selectMode = async (mode) => {
    try {
      await AsyncStorage.setItem('userMode', mode);
      setUserMode(mode);
    } catch (error) {
      console.error('Error saving user mode:', error);
    }
  };

  const switchMode = async () => {
    try {
      await AsyncStorage.removeItem('userMode');
      setUserMode(null);
    } catch (error) {
      console.error('Error switching mode:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show role selection if no mode selected
  if (!userMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.selectionContainer}>
          <Text style={styles.logo}>🚕</Text>
          <Text style={styles.appTitle}>東京AIタクシー</Text>
          <Text style={styles.version}>Version 2.0.0</Text>
          
          <Text style={styles.selectPrompt}>ご利用方法を選択してください</Text>
          <Text style={styles.selectSubtext}>Select how you want to use the app</Text>
          
          <TouchableOpacity 
            style={[styles.modeButton, styles.customerButton]}
            onPress={() => selectMode('customer')}
          >
            <Text style={styles.modeIcon}>👤</Text>
            <Text style={styles.modeTitle}>お客様として利用</Text>
            <Text style={styles.modeSubtitle}>Customer Mode</Text>
            <Text style={styles.modeDescription}>タクシーを予約・配車</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modeButton, styles.driverButton]}
            onPress={() => selectMode('driver')}
          >
            <Text style={styles.modeIcon}>🚗</Text>
            <Text style={styles.modeTitle}>ドライバーとして利用</Text>
            <Text style={styles.modeSubtitle}>Driver Mode</Text>
            <Text style={styles.modeDescription}>配車リクエストを受信</Text>
          </TouchableOpacity>
          
          <View style={styles.features}>
            <Text style={styles.featureText}>🌧️ Weather-based demand prediction</Text>
            <Text style={styles.featureText}>📲 LINE integration</Text>
            <Text style={styles.featureText}>🤖 AI-powered routing</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return userMode === 'driver' ? 
    <DriverScreen onSwitchMode={switchMode} /> : 
    <CustomerScreen onSwitchMode={switchMode} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 80,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30,
  },
  selectPrompt: {
    fontSize: 18,
    color: '#333',
    marginBottom: 5,
  },
  selectSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  modeButton: {
    width: '100%',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerButton: {
    backgroundColor: '#4CAF50',
  },
  driverButton: {
    backgroundColor: '#2196F3',
  },
  modeIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  modeTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modeSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  modeDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 5,
  },
  features: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    width: '100%',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});
