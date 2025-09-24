# Daily Video Calling Setup Guide

## 環境変数の設定

Cloudflare Pagesで以下の環境変数を設定してください：

### プレーンテキスト変数
- `DAILY_DOMAIN`: Dailyのドメイン（例：your-domain.daily.co）
- `FIREBASE_PROJECT_ID`: FirebaseプロジェクトID
- `NODE_ENV`: 環境（production/development）
- `VITE_API_URL`: APIのベースURL

### シークレット変数
- `DAILY_API_KEY`: Daily APIキー
- `FIREBASE_CLIENT_EMAIL`: Firebaseサービスアカウントのクライアントメール
- `FIREBASE_PRIVATE_KEY`: Firebaseサービスアカウントのプライベートキー

## Cloudflare Pagesでの設定手順

1. Cloudflare Pagesダッシュボードにアクセス
2. プロジェクトの「Settings」→「Environment Variables」に移動
3. 上記の環境変数を追加

## 機能概要

### 実装された機能
- **Daily通話ルーム作成**: Cloudflare Pagesサーバレス関数でDailyルームを自動作成
- **リアルタイム同期**: Firebase Realtime DatabaseとDailyの状態を同期
- **参加者管理**: ユーザーの参加状態（true/false）に応じてDaily通話に参加/離脱
- **ビデオ通話UI**: Dailyのiframeを使用した通話インターフェース

### ファイル構成
- `functions/daily-room.js`: Dailyルーム作成用サーバレス関数
- `functions/daily-token.js`: Daily通話トークン生成用サーバレス関数
- `src/components/VideoCall/VideoCallRoom.jsx`: 通話UIコンポーネント
- `src/firebase/daily.js`: Daily状態管理用Firebase関数
- `src/pages/CarNavigation.jsx`: 通話機能統合済みカーナビ画面

### 使用方法
1. ルーム作成時に自動的にDaily通話ルームが作成される
2. ユーザーがCarNavigation画面に参加すると通話ボタンが表示される
3. 「通話を開始」ボタンを押すとDaily通話に参加
4. 参加者の状態はFirebase Realtime Databaseでリアルタイム同期される

## 注意事項
- Daily APIキーは適切に管理し、公開しないでください
- Firebase認証情報も機密情報として扱ってください
- 本番環境では適切なドメイン設定を行ってください
