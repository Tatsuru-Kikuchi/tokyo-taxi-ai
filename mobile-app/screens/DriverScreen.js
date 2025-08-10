import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  // ... other imports
} from 'react-native';

import io from 'socket.io-client';

const BACKEND_URL = 'http://10.59.111.31:3000';

export default function DriverScreen({ onSwitchMode }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Add connection here if it doesn't exist
    const newSocket = io(BACKEND_URL);

    newSocket.on('connect', () => {
      console.log('Connected to backend');
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const selectUserType = async (type) => {
    // Save their choice
    await AsyncStorage.setItem('userType', type);
    setUserType(type);
  };

  // If they haven't chosen yet, show selection screen
  if (!userType) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView>
    	  <View style={styles.header}>
            <Text style={styles.title}>🚗 Driver Mode</Text>
        </View>
	       <TouchableOpacity onPress={onSwitchMode} style={styles.switchButton}>
  	      <Text style={styles.switchText}>お客様モードへ</Text>
	       </TouchableOpacity>
          <Text style={styles.title}>東京AIタクシー</Text>
          <Text style={styles.subtitle}>ご利用方法を選択してください</Text>

          {/* Customer Button */}
          <TouchableOpacity
            style={[styles.button, styles.customerButton]}
            onPress={() => selectUserType('customer')}
          >
            <Text style={styles.buttonText}>👤 お客様として利用</Text>
            <Text style={styles.buttonSubtext}>タクシーを予約する</Text>
          </TouchableOpacity>

          {/* Driver Button */}
          <TouchableOpacity
            style={[styles.button, styles.driverButton]}
            onPress={() => selectUserType('driver')}
          >
            <Text style={styles.buttonText}>🚗 ドライバーとして利用</Text>
            <Text style={styles.buttonSubtext}>配車リクエストを受ける</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show the appropriate screen based on their choice
  if (userType === 'driver') {
    return <DriverScreen />;  // Your existing driver interface
  } else {
    return <CustomerScreen />; // New customer interface
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  switchButton: {
  position: 'absolute',
  right: 20,
  top: 20,
  backgroundColor: '#4CAF50',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 5,
  },
  switchText: {
  color: 'white',
  fontSize: 12,
  fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    width: '100%',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  customerButton: {
    backgroundColor: '#4CAF50',
  },
  driverButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
});
