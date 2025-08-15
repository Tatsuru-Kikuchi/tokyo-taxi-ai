import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { CONFIG } from './config';  // ← 追加

// Railway の URL を使用
const BACKEND_URL = CONFIG.BACKEND_URL;  // ← 追加

export default function App() {
  const [mode, setMode] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(
        '位置情報の許可が必要です',
        'このアプリは位置情報を使用してタクシーの配車を行います。',
        [{ text: 'OK' }]
      );
    }
  };

  const ModeSelection = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.selectionContainer}>
        <Text style={styles.appTitle}>🚕 全国AIタクシー</Text>
        <Text style={styles.subtitle}>AI需要予測・配車マッチングシステム</Text>

        <View style={styles.featuresContainer}>
          <Text style={styles.featureTitle}>✨ 新機能</Text>
          <Text style={styles.featureItem}>☔ 雨の30分前に通知</Text>
          <Text style={styles.featureItem}>🚨 事故発生時の即座予約</Text>
          <Text style={styles.featureItem}>📊 AI収益予測 (ドライバー向け)</Text>
          <Text style={styles.featureItem}>🗺️ リアルタイム需要ヒートマップ</Text>
        </View>

        <TouchableOpacity
          style={[styles.modeButton, styles.customerButton]}
          onPress={() => setMode('customer')}
        >
          <Text style={styles.buttonIcon}>👤</Text>
          <Text style={styles.buttonTitle}>お客様</Text>
          <Text style={styles.buttonDescription}>タクシーを呼ぶ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, styles.driverButton]}
          onPress={() => setMode('driver')}
        >
          <Text style={styles.buttonIcon}>🚗</Text>
          <Text style={styles.buttonTitle}>ドライバー</Text>
          <Text style={styles.buttonDescription}>配車を受ける</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaProvider>
      {mode === null && <ModeSelection />}
      {mode === 'customer' && (
        <CustomerScreenEnhanced
          backendUrl={BACKEND_URL}
          onBack={() => setMode(null)}
        />
      )}
      {mode === 'driver' && (
        <DriverScreenEnhanced
          backendUrl={BACKEND_URL}
          onBack={() => setMode(null)}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectionContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  featuresContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  featureItem: {
    fontSize: 14,
    marginVertical: 3,
    color: '#555',
  },
  modeButton: {
    padding: 20,
    borderRadius: 15,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerButton: {
    backgroundColor: '#4A90E2',
  },
  driverButton: {
    backgroundColor: '#FF6B6B',
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
  buttonDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
});
