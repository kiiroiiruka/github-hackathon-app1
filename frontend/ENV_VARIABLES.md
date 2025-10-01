# 環境変数の設定方法

このプロジェクトでは、`.env`ファイルを使用して開発用機能の表示/非表示を制御できます。

## 環境変数ファイルの作成

プロジェクトのルートディレクトリ（`frontend/`）に`.env`ファイルを作成してください：

### `.env`（すべての環境で使用）
```env
# デバッグモード（GPS操作パネルなど）の表示/非表示
VITE_ENABLE_DEBUG_MODE=true

# 開発ページボタンの表示/非表示
VITE_SHOW_DEV_BUTTONS=true
```

**重要**: このファイルは`.gitignore`に含まれているため、Gitにコミットされません。

## 環境変数の説明

### `VITE_ENABLE_DEBUG_MODE`
**デバッグモード（GPS操作パネルなど）の表示/非表示を制御**

- `true`: デバッグモードを表示
- `false`: デバッグモードを非表示

**影響する機能:**
- `CarNavigation.jsx`: GPS座標操作パネル
- `parking/index.jsx`: 現在地調整パネル
- `navi/index.jsx`: テスト用ボタン

### `VITE_SHOW_DEV_BUTTONS`
**開発ページへのボタンの表示/非表示を制御**

- `true`: 開発ページボタンを表示
- `false`: 開発ページボタンを非表示

**影響する機能:**
- `home/FriendPage.jsx`: 開発ページボタン

## 使用方法

### 開発時
```bash
# .envファイルを編集
# VITE_ENABLE_DEBUG_MODE=true
# VITE_SHOW_DEV_BUTTONS=true

# 開発環境で起動
npm run dev
```

### 本番ビルド時
```bash
# .envファイルを編集
# VITE_ENABLE_DEBUG_MODE=false
# VITE_SHOW_DEV_BUTTONS=false

# 本番環境用にビルド
npm run build
```

## デフォルト動作

環境変数ファイルが存在しない場合、以下のデフォルト値が使用されます：
- 開発モード（`npm run dev`）: すべて `true`（開発用機能が表示される）
- 本番モード（`npm run build`）: 環境変数の値、または`import.meta.env.DEV`の値に依存

## 注意事項

1. **環境変数ファイルは `.gitignore` に追加済み**  
   機密情報を含む場合があるため、Gitにコミットされません。

2. **Viteの環境変数は `VITE_` プレフィックスが必要**  
   `VITE_` で始まる環境変数のみがクライアント側で利用可能です。

3. **環境変数の変更後は再起動が必要**  
   `.env`ファイルを変更した場合、開発サーバーを再起動してください。

4. **本番環境での確認**  
   デプロイ前に`.env`ファイルで`false`に設定し、`npm run build`でビルドして、開発用機能が非表示になっていることを確認してください。

5. **Cloudflare Pagesへのデプロイ時**  
   Cloudflare Pagesの環境変数設定で以下を追加してください：
   - `VITE_ENABLE_DEBUG_MODE`: `false`
   - `VITE_SHOW_DEV_BUTTONS`: `false`

## コード例

```javascript
import { isDebugModeEnabled, showDevButtons } from "@/utils/env";

// デバッグモードの表示/非表示
{isDebugModeEnabled() && (
  <div>
    🔧 GPS座標操作（開発用）
  </div>
)}

// 開発ページボタンの表示/非表示
{showDevButtons() && (
  <button onClick={() => navigate("/dashboard/development")}>
    開発ページ
  </button>
)}
```

## トラブルシューティング

### 環境変数が反映されない
1. 開発サーバーを再起動してください
2. ファイル名が正しいか確認（`.env.development` / `.env.production`）
3. `VITE_` プレフィックスが付いているか確認

### 本番環境でも開発用機能が表示される
1. `.env.production` で `false` に設定されているか確認
2. ビルドコマンド（`npm run build`）で正しくビルドされているか確認
3. Cloudflare Pagesの環境変数設定を確認

