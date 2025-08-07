// Driver Screen - Receive ride requests
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView
} from 'react-native';
import io from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3000'; // Change to your server IP

export default function DriverScreen({ onSwitchMode }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    connectToBackend();
    return () => {
      if (socket) socket.close();
    };
  }, []);

  const connectToBackend = () => {
    const newSocket = io(BACKEND_URL);
    
    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('ride:new', (ride) => {
      Alert.alert(
        '🆕 新しい配車リクエスト',
        `From: ${ride.pickup}\nTo: ${ride.destination}`,
        [
          { text: 'Decline', style: 'cancel' },
          { text: 'Accept', onPress: () => acceptRide(ride) }
        ]
      );
    });

    setSocket(newSocket);
  };

  const goOnline = () => {
    setOnline(true);
    socket.emit('driver:connect', {
      driverId: 'driver_' + Math.random().toString(36).substr(2, 9),
      name: 'Driver'
    });
  };

  const goOffline = () => {
    setOnline(false);
    socket.emit('driver:offline');
  };

  const acceptRide = (ride) => {
    setCurrentRide(ride);
    socket.emit('ride:accept', { rideId: ride.rideId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🚗 ドライバー</Text>
          <TouchableOpacity onPress={onSwitchMode} style={styles.switchButton}>
            <Text style={styles.switchText}>お客様モードへ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: online ? '#4CAF50' : '#999' }]} />
          <Text>{online ? 'オンライン' : 'オフライン'}</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.toggleButton, online ? styles.offlineButton : styles.onlineButton]}
            onPress={online ? goOffline : goOnline}
            disabled={!connected}
          >
            <Text style={styles.toggleButtonText}>
              {online ? 'オフラインにする' : 'オンラインにする'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.cardTitle}>本日の売上</Text>
          <Text style={styles.earningsAmount}>¥{earnings.toLocaleString()}</Text>
        </View>

        {currentRide && (
          <View style={styles.rideCard}>
            <Text style={styles.cardTitle}>現在の配車</Text>
            <Text>From: {currentRide.pickup}</Text>
            <Text>To: {currentRide.destination}</Text>
          </View>
        )}

        {online && (
          <View style={styles.aiCard}>
            <Text style={styles.cardTitle}>🤖 AI推奨</Text>
            <Text style={styles.aiText}>• 渋谷駅へ移動 (30分後に雨)</Text>
            <Text style={styles.aiText}>• 18:00に需要増加予測</Text>
            <Text style={styles.aiText}>• 六本木エリアがおすすめ</Text>
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
    backgroundColor: '#4CAF50',
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
  controls: {
    padding: 20,
  },
  toggleButton: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  onlineButton: {
    backgroundColor: '#4CAF50',
  },
  offlineButton: {
    backgroundColor: '#f44336',
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  earningsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
  },
  cardTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  rideCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
  },
  aiCard: {
    backgroundColor: '#F1F8E9',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
  },
  aiText: {
    fontSize: 14,
    color: '#33691E',
    marginTop: 8,
  },
});