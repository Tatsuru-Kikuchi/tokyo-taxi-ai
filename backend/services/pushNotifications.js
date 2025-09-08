// backend/services/pushNotifications.js
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need service account key)
admin.initializeApp({
  credential: admin.credential.cert({
    // Add your service account details here
    projectId: "zenkoku-ai-taxi",
    clientEmail: "firebase-adminsdk@zenkoku-ai-taxi.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY
  })
});

async function sendPushNotification(token, title, body, data) {
  const message = {
    token: token,
    notification: { title, body },
    data: data,
    android: {
      notification: {
        icon: 'notification_icon',
        color: '#FFD700'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  };

  try {
    await admin.messaging().send(message);
    console.log('Push notification sent');
  } catch (error) {
    console.error('Push notification error:', error);
  }
}

module.exports = { sendPushNotification };
