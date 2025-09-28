# ユーザーUID管理システム

このプロジェクトでは、Jotaiを使用してユーザーのUIDをグローバルに管理しています。

## ファイル構成

- `userAtom.js`: ユーザー関連のatom定義
- `index.js`: atomのエクスポートをまとめるファイル

## 使用方法

### 1. ユーザーUIDを取得する

```jsx
import { useUserUid } from '../hooks/useUserUid';

function MyComponent() {
  const userUid = useUserUid();
  
  if (userUid) {
    console.log('Current user UID:', userUid);
  }
  
  return <div>User ID: {userUid}</div>;
}
```

### 2. ログイン状態を取得する

```jsx
import { useIsLoggedIn } from '../hooks/useUser';

function MyComponent() {
  const isLoggedIn = useIsLoggedIn();
  
  return (
    <div>
      {isLoggedIn ? (
        <p>ログイン中</p>
      ) : (
        <p>ログアウト中</p>
      )}
    </div>
  );
}
```

### 3. 認証状態を監視する

`useAuthState`フックは`App.jsx`で既に使用されており、認証状態の変化を自動的にatomに反映します。

## 自動化された機能

- 新規登録時：Firebase認証が成功すると、自動的にUIDがatomに保存されます
- ログイン時：認証状態の変化を検知して、atomに反映されます
- ログアウト時：atomが自動的にクリアされます

## 利用可能なAtom

- `userUidAtom`: ユーザーのUID（string | null）
- `isLoggedInAtom`: ログイン状態（boolean）
