<<<<<<< HEAD
# 🚕 全国AIタクシー Backend

## Version
3.0.1

## Setup Instructions

### 1. Install Dependencies
\```bash
npm install
\```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your API keys:
\```bash
cp .env.example .env
\```

### 3. Run Development Server
\```bash
npm run dev
\```

### 4. Run Production Server
\```bash
npm start
\```

## Directory Structure
\```
backend/
├── server.js              # Main server file
├── config/               # Configuration files
├── services/            # Service modules
├── data/               # Static data
└── backup/            # Backup files (git ignored)
\```

## API Endpoints

### Health Check
- GET `/health` - Server health status

### Train APIs
- GET `/api/trains/schedule` - Get train schedules
- POST `/api/trains/delays` - Check for delays

### Booking APIs
- POST `/api/bookings/create` - Create new booking
- GET `/api/bookings/:id` - Get booking details

### Driver APIs
- GET `/api/drivers/nearby` - Find nearby drivers
- GET `/api/drivers/online` - List online drivers

### Payment APIs
- POST `/api/payment/credit-card` - Process credit card (mock)
- POST `/api/payment/ic-card` - Process IC card (mock)

## Deployment

### Railway
1. Set root directory to `backend`
2. Set start command to `npm start`
3. Add environment variables in Railway dashboard

### Local Testing
\```bash
npm run dev
\```

## Security Notes
- Never commit `.env` file
- Never commit `serviceAccountKey.json`
- Keep all API keys secure
\```

## 4. Updated package.json
```json
{
  "name": "zenkoku-ai-taxi-backend",
  "version": "3.0.1",
  "description": "全国AIタクシー Backend Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Test mode\" && exit 0",
    "clean": "rm -rf node_modules package-lock.json && npm install"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "socket.io": "^4.6.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "taxi",
    "japan",
    "transportation",
    "api",
    "realtime"
  ],
  "author": "Tatsuru Kikuchi",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/tatsuru-kikuchi/tokyo-taxi-ai"
  }
}
=======
# 🚕 全国AIタクシー (Nationwide AI Taxi)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React%20Native-0.72.6-blue)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2049-black)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Railway](https://img.shields.io/badge/Deployed%20on-Railway-purple)](https://railway.app/)

AI技術を活用した次世代配車サービスアプリケーション。天候・交通情報・需要予測を統合し、最適な配車と料金設定を実現します。

## 🌟 主な機能

### お客様向け機能
- 🗺️ **リアルタイム配車マッチング** - 最寄りのドライバーを即座にマッチング
- 💰 **透明な料金体系** - AI による事前料金見積もり
- 🌤️ **天候連動料金** - 天気状況を考慮した公平な価格設定
- 📍 **正確な位置追跡** - リアルタイムでドライバーの位置を確認
- 💬 **LINE 通知連携** - 配車状況を LINE でお知らせ

### ドライバー向け機能
- 📊 **AI 収益予測** - 機械学習による収益最適化提案
- 🔥 **需要ヒートマップ** - リアルタイム需要可視化
- 🚦 **交通情報統合** - 最適ルート自動提案
- 📈 **収益分析ダッシュボード** - 日次・週次・月次の収益管理
- 🎯 **スマート配車** - AI による効率的な配車割り当て

## 🛠️ 技術スタック

### フロントエンド（モバイルアプリ）
- **React Native** - クロスプラットフォーム開発
- **Expo SDK 49** - 開発環境・ビルドツール
- **React Native Maps** - 地図表示
- **Socket.io Client** - リアルタイム通信
- **AsyncStorage** - ローカルデータ保存

### バックエンド
- **Node.js** - サーバーランタイム
- **Express.js** - Web フレームワーク
- **Socket.io** - WebSocket 通信
- **TensorFlow.js** - AI/機械学習モデル

### 外部 API
- **Google Maps API** - 地図・ジオコーディング
- **OpenWeather API** - 天気情報
- **LINE Messaging API** - 通知連携

### インフラ
- **Railway** - バックエンドホスティング
- **GitHub Pages** - ドキュメントホスティング
- **EAS Build** - アプリビルドサービス

## 📱 アプリのダウンロード

- **iOS**: App Store (審査中)
- **Android**: Google Play (準備中)

## 🚀 開発環境のセットアップ

### 必要な環境
- Node.js 18.0.0 以上
- npm または yarn
- Expo CLI
- iOS: Xcode (Mac のみ)
- Android: Android Studio

### インストール手順

1. **リポジトリのクローン**
```bash
git clone https://github.com/Tatsuru-Kikuchi/tokyo-taxi-ai.git
cd tokyo-taxi-ai
```

2. **バックエンドのセットアップ**
```bash
cd backend
npm install

# 環境変数の設定 (.env ファイルを作成)
cat > .env << EOL
PORT=3000
WEATHER_API_KEY=your_openweather_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
EOL

# 開発サーバー起動
npm run dev
```

3. **モバイルアプリのセットアップ**
```bash
cd ../mobile-app
npm install

# 設定ファイルの作成
cat > config.js << EOL
export const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key',
};
EOL

# Expo 開発サーバー起動
npx expo start
```

## 📊 アーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Mobile App     │────▶│  Backend API     │────▶│  External APIs  │
│  (React Native) │     │  (Node.js)       │     │  (Maps/Weather) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         
        │                        │                         
        ▼                        ▼                         
┌─────────────────┐     ┌──────────────────┐              
│  Local Storage  │     │  AI Models       │              
│  (AsyncStorage) │     │  (TensorFlow.js) │              
└─────────────────┘     └──────────────────┘              
```

## 🔧 API エンドポイント

- **Production**: `https://tokyo-taxi-ai-backend-production.up.railway.app`
- **Development**: `http://localhost:3000`

### 主要な API ルート
- `GET /health` - ヘルスチェック
- `GET /api/weather` - 天気情報取得
- `POST /api/demand-predictions` - 需要予測
- `GET /api/surge-pricing` - サージ料金計算
- `WebSocket /` - リアルタイム通信

## 📈 パフォーマンス最適化

- **コード分割** - 動的インポートによる初期ロード時間の短縮
- **画像最適化** - WebP フォーマット使用
- **キャッシング** - API レスポンスの効率的なキャッシュ
- **WebSocket 再接続** - 自動再接続メカニズム

## 🔒 セキュリティ

- **HTTPS 通信** - 全ての API 通信を暗号化
- **認証トークン** - JWT による安全な認証
- **入力検証** - XSS/SQL インジェクション対策
- **レート制限** - API アクセス制限

## 🧪 テスト

```bash
# バックエンドテスト
cd backend
npm test

# モバイルアプリテスト
cd mobile-app
npm test
```

## 📝 ドキュメント

- [サポートページ](https://tatsuru-kikuchi.github.io/tokyo-taxi-ai/)
- [プライバシーポリシー](https://tatsuru-kikuchi.github.io/tokyo-taxi-ai/privacy.html)
- [利用規約](https://tatsuru-kikuchi.github.io/tokyo-taxi-ai/terms.html)
- [API ドキュメント](https://github.com/Tatsuru-Kikuchi/tokyo-taxi-ai/wiki/API-Documentation)

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まず Issue を開いて変更内容を議論してください。

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 👤 作者

**Tatsuru Kikuchi**

- GitHub: [@Tatsuru-Kikuchi](https://github.com/Tatsuru-Kikuchi)
- Project Link: [https://github.com/Tatsuru-Kikuchi/tokyo-taxi-ai](https://github.com/Tatsuru-Kikuchi/tokyo-taxi-ai)

## 🙏 謝辞

- [Expo](https://expo.dev/) - 素晴らしい開発体験を提供
- [Railway](https://railway.app/) - シンプルで強力なホスティング
- [OpenWeather](https://openweathermap.org/) - 天気データ API
- [Google Maps Platform](https://developers.google.com/maps) - 地図サービス

## 📞 サポート

問題が発生した場合や質問がある場合は、以下の方法でお問い合わせください：

- 📧 Email: support@tokyo-taxi-ai.example.com
- 🐛 Issues: [GitHub Issues](https://github.com/Tatsuru-Kikuchi/tokyo-taxi-ai/issues)
- 📖 Docs: [サポートページ](https://tatsuru-kikuchi.github.io/tokyo-taxi-ai/)

## 🚀 今後の機能追加予定

- [ ] 多言語対応（英語、中国語、韓国語）
- [ ] Apple Pay / Google Pay 統合
- [ ] 音声による配車リクエスト
- [ ] カーボンニュートラル配車オプション
- [ ] 企業向け管理ダッシュボード
- [ ] ドライバー評価システム
- [ ] 予約配車機能
- [ ] 相乗りマッチング機能

## 📊 プロジェクトステータス

- 🟢 **Backend API**: 稼働中 - [Status](https://tokyo-taxi-ai-backend-production.up.railway.app/health)
- 🟡 **iOS App**: App Store 審査中
- 🟡 **Android App**: 開発中
- 🟢 **Documentation**: 公開中 - [Docs](https://tatsuru-kikuchi.github.io/tokyo-taxi-ai/)

---

<p align="center">
  <strong>🚕 全国AIタクシー</strong><br>
  革新的なAI技術で、移動をもっと便利に、もっと快適に<br><br>
  Made with ❤️ by Tatsuru Kikuchi<br>
  © 2025 All Rights Reserved
</p>
>>>>>>> 7847aa551099852e710259111fe8828a84ef5396
