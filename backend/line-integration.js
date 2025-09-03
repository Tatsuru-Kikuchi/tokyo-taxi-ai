const line = require('@line/bot-sdk');

// LINE設定（取得したIDとSecretを使用）
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(lineConfig);

// LINEメッセージ送信機能
async function sendLineNotification(userId, message) {
  try {
    await client.pushMessage(userId, {
      type: 'text',
      text: message
    });
  } catch (error) {
    console.error('LINE notification error:', error);
  }
}

// 雨予報通知
async function notifyRainForecast(users) {
  const message = `☔ 雨の予報\n30分後に雨が降る予定です。\n今すぐタクシーを予約しますか？\n\n予約はこちら: https://ai-taxi.jp/book`;
  
  for (const user of users) {
    await sendLineNotification(user.lineUserId, message);
  }
}

// 事故発生通知
async function notifyTrafficAccident(affectedUsers, location) {
  const message = `🚨 交通事故発生\n${location}付近で事故が発生しました。\n代替交通手段としてタクシーをご利用ください。\n\n即座予約: https://ai-taxi.jp/emergency`;
  
  for (const user of affectedUsers) {
    await sendLineNotification(user.lineUserId, message);
  }
}

module.exports = {
  sendLineNotification,
  notifyRainForecast,
  notifyTrafficAccident
};
