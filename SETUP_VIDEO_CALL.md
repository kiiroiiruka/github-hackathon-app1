# 通話機能セットアップガイド

## 🎯 通話を有効にするための設定手順

### 1. Daily.co APIキーの取得
1. [Daily.co](https://daily.co)にアカウント登録
2. ダッシュボードでAPI Keyを取得

### 2. 環境変数の設定

#### ローカル開発用
```bash
# functions/.env ファイルを作成
DAILY_API_KEY=your_daily_api_key_here
```

#### Cloudflare Pages本番環境用
```bash
# Cloudflare Pages にシークレットを設定
wrangler pages secret put DAILY_API_KEY --project-name github-hackathon-app1

# または Cloudflare Dashboard で設定:
# Pages > Your Project > Settings > Environment Variables
# DAILY_API_KEY (Encrypted) = your_daily_api_key_here
```

### 3. 依存関係のインストール
```bash
# メインプロジェクト
npm install

# Functions
cd functions
npm install
```

### 4. ローカル開発サーバーの起動
```bash
# ターミナル1: React開発サーバー
npm run dev

# ターミナル2: Cloudflare Functions開発サーバー
npx wrangler pages dev dist --compatibility-date=2024-01-01
```

### 5. テスト手順
1. ユーザー1でログイン
2. 友達を追加（ユーザー2）
3. ルームを作成して友達を招待
4. CarNavigationページに移動
5. "通話を開始"ボタンをクリック
6. ユーザー2も同じルームに参加してビデオ通話開始

## ✅ 修正済みの機能

### 認証状態管理の改善
- `auth.currentUser`の直接参照を避けて`useUserUid`フックを使用
- Firebase Authの非同期ロード完了を待機
- 認証状態が確定してからFirebase操作を実行

### 自動参加/離脱機能
- CarNavigationページに入る: `accepted: true`
- CarNavigationページから離れる: `accepted: false`
- ブラウザ終了時も状態をリセット

### Daily.co連携
- Firebase RTDBでルーム作成時にDaily.coルームも自動作成
- ルーム情報に`dailyRoom`フィールドを保存
- ビデオ通話参加状態をFirebase RTDBと同期

## 🐛 潜在的なトラブルシューティング

### API エラーが発生する場合
1. Daily.co API キーが正しく設定されているか確認
2. Cloudflare Functionsのログを確認: `wrangler pages tail`
3. ネットワークタブでAPI呼び出しの応答を確認

### 通話ボタンが表示されない場合
1. Firebase RTDBにdailyRoomフィールドがあるか確認
2. ルーム作成時のエラーログを確認
3. `createRoomWithInvites`関数のレスポンスを確認

### 認証エラーが発生する場合
1. Firebase認証が完了してからページに遷移しているか確認
2. `useUserUid`が正しい値を返すまで待機
3. `auth.currentUser`とatomの同期状態を確認

## 📝 環境変数チェックリスト

- [ ] Daily.co APIキーを取得済み
- [ ] `functions/.env`にAPIキーを設定（ローカル開発）
- [ ] Cloudflare PagesにシークレットAPIキーを設定（本番）
- [ ] Firebase設定が正しく動作している
- [ ] ルーム作成でDaily.coルームも作成される

これらすべてが設定されれば、通話機能が動作するはずです！