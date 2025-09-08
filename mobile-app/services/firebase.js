// mobile-app/services/firebase.js
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

class FirebaseService {
  async initializeFirebase() {
    // Firebase is auto-initialized by Expo when google-services.json 
    // and GoogleService-Info.plist are present
    console.log('Firebase initialized for', Platform.OS);
    
    // Register for push notifications
    if (Device.isDevice) {
      const token = await this.registerForPushNotifications();
      return token;
    }
    
    return null;
  }

  async registerForPushNotifications() {
    let token;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Get Expo push token for FCM
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId
    })).data;
    
    console.log('Push token:', token);
    
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD700',
      });
    }
    
    return token;
  }
}

export default new FirebaseService();
