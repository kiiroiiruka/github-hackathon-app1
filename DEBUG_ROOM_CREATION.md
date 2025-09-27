# Firebase Realtime Database Security Rules確認

以下のFirebase Security Rulesが適用されているか確認してください：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null && (
          !data.exists() || 
          data.child('ownerUid').val() == auth.uid ||
          data.child('members').child(auth.uid).exists()
        )",
        "members": {
          "$userId": {
            ".write": "auth != null && (
              $userId == auth.uid ||
              root.child('rooms').child($roomId).child('ownerUid').val() == auth.uid
            )"
          }
        }
      }
    }
  }
}
```

## 問題の確認手順

1. **ブラウザのコンソールログを確認**:
   - "Room creation - Current User:" が表示されるか
   - "Room creation - Owner member data:" が表示されるか
   - "Room data saved:" でownersが含まれているか

2. **Firebase Console で確認**:
   - Firebase Console → Realtime Database
   - ルール設定が適切か確認
   - データが正しく保存されているか確認

3. **ネットワークタブで確認**:
   - Daily.co API呼び出しが成功しているか
   - Firebase書き込みでエラーが発生していないか