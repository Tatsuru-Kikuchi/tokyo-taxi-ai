// CustomerScreen.js with safety checks
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Linking
} from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'http://10.59.111.31:3000';
const LINE_OA_ID = '@dhai52765howdah';

export default function CustomerScreen({ onSwitchMode }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [rideStatus, setRideStatus] = useState('idle');
  const [onlineDrivers, setOnlineDrivers] = useState(0);

  useEffect(() => {
    connectToBackend();
    return () => {
      if (socket) socket.close();
    };
  }, []);

  const connectToBackend = () => {
    try {
      const newSocket = io(BACKEND_URL);

      newSocket.on('connect', () => {
        console.log('Connected to backend');
        setConnected(true);
        newSocket.emit('customer:connect', {
          customerId: 'customer_' + Math.random().toString(36).substr(2, 9)
        });
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setConnected(false);
      });

      newSocket.on('drivers:update', (data) => {
        setOnlineDrivers(data.onlineCount || 0);
      });

      newSocket.on('ride:accepted', () => {
        setRideStatus('accepted');
        Alert.alert('🚕 Driver Found!', 'Your driver is on the way!');
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Connection error:', error);
      setConnected(false);
    }
  };

  const requestRide = () => {
    if (!pickup || !destination) {
      Alert.alert('Error', 'Please enter both locations');
      return;
    }

    if (!socket || !connected) {
      Alert.alert('Connection Error', 'Not connected to server. Please try again.');
      return;
    }

    setRideStatus('requesting');
    socket.emit('ride:request', {
      pickup,
      destination,
      timestamp: new Date().toISOString()
    });
  };

  const openLINE = () => {
    const lineURL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
    Linking.openURL(lineURL).catch(() => {
      Alert.alert('Error', 'LINE app not installed or invalid ID');
    });
  };

  // Safe switch handler
  const handleSwitch = () => {
    if (onSwitchMode) {
      onSwitchMode();
    } else {
      console.log('onSwitchMode not provided');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚕 お客様</Text>
          <TouchableOpacity onPress={handleSwitch} style={styles.switchButton}>
            <Text style={styles.switchText}>ドライバーモードへ</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: connected ? '#4CAF50' : '#f44336' }]} />
          <Text>{connected ? `${onlineDrivers} drivers available` : 'Connecting...'}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={openLINE}>
            <Text style={styles.actionText}>💬 LINE予約</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Form */}
        <View style={styles.bookingForm}>
          <Text style={styles.sectionTitle}>配車予約</Text>

          <TextInput
            style={styles.input}
            placeholder="📍 乗車場所"
            value={pickup}
            onChangeText={setPickup}
            editable={rideStatus === 'idle'}
          />

          <TextInput
            style={styles.input}
            placeholder="🎯 目的地"
            value={destination}
            onChangeText={setDestination}
            editable={rideStatus === 'idle'}
          />

          <TouchableOpacity
            style={[styles.bookButton, (!connected || rideStatus !== 'idle') && styles.bookButtonDisabled]}
            onPress={requestRide}
            disabled={!connected || rideStatus !== 'idle'}
          >
            <Text style={styles.bookButtonText}>
              {rideStatus === 'idle' ? '配車リクエスト' : '処理中...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Display */}
        {rideStatus === 'requesting' && (
          <View style={styles.statusCard}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.statusText}>ドライバーを探しています...</Text>
          </View>
        )}

        {rideStatus === 'accepted' && (
          <View style={styles.statusCard}>
            <Text style={styles.emoji}>🚕</Text>
            <Text style={styles.statusText}>ドライバーが向かっています！</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setRideStatus('idle');
                setPickup('');
                setDestination('');
              }}
            >
              <Text style={styles.cancelButtonText}>新しい予約</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  switchButton: {
    padding: 10,
    backgroundColor: '#2196F3',
    borderRadius: 5,
  },
  switchText: {
    color: 'white',
    fontSize: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    marginTop: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  quickActions: {
    padding: 20,
  },
  actionButton: {
    backgroundColor: '#00B900',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookingForm: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 5,
  },
  cancelButtonText: {
    color: '#4CAF50',
    fontSize: 14,
  },
});
