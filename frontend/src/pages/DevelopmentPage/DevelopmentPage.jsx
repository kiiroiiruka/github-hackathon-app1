import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderComponent2 from "@/components/Header/Header2";
import { db } from "@/firebase/firebaseConfig";
import { getUser } from "@/firebase/users";
import { useUserUid } from "@/hooks/useUserUid";

const DevelopmentPage = () => {
  const navigate = useNavigate();
  const currentUserId = useUserUid();
  const [isCreating, setIsCreating] = useState(false);

  // 戻るボタンの処理
  const handleBackClick = () => {
    navigate("/dashboard");
  };

  // ダミー友達リクエスト（受信）を作成
  const createDummyReceivedRequest = async () => {
    if (!currentUserId || isCreating) return;
    setIsCreating(true);

    try {
      const dummySenderId = `dummy_sender_${Date.now()}`;
      const requestId = `${dummySenderId}_${currentUserId}`;

      // ダミー送信者をusersコレクションに作成
      const dummySenderData = {
        displayName: `ダミーユーザー${Math.floor(Math.random() * 1000)}`,
        photoURL: "/vite.svg",
        userShortMessage: "よろしくお願いします！",
        createdAt: serverTimestamp(),
        email: `dummy${Date.now()}@example.com`,
      };

      await setDoc(doc(db, "users", dummySenderId), dummySenderData);

      // 友達リクエストを作成
      const requestData = {
        fromUserId: dummySenderId,
        toUserId: currentUserId,
        senderName: dummySenderData.displayName,
        senderPhotoURL: dummySenderData.photoURL,
        senderUid: dummySenderId,
        senderMessage: dummySenderData.userShortMessage,
        senderCreatedAt: dummySenderData.createdAt,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "friendRequests", requestId), requestData);

      alert("ダミー受信友達リクエストを作成しました！");
    } catch (error) {
      console.error("ダミー受信友達リクエスト作成エラー:", error);
      alert("ダミー受信友達リクエストの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  // ダミー友達リクエスト（送信）を作成
  const createDummySentRequest = async () => {
    if (!currentUserId || isCreating) return;
    setIsCreating(true);

    try {
      const dummyRecipientId = `dummy_recipient_${Date.now()}`;
      const requestId = `${currentUserId}_${dummyRecipientId}`;

      // 現在のユーザー情報を取得
      const currentUserData = await getUser(currentUserId);

      // ダミー受信者をusersコレクションに作成
      const dummyRecipientData = {
        displayName: `ダミー相手${Math.floor(Math.random() * 1000)}`,
        photoURL: "/vite.svg",
        userShortMessage: "こんにちは！",
        createdAt: serverTimestamp(),
        email: `dummyrecipient${Date.now()}@example.com`,
      };

      await setDoc(doc(db, "users", dummyRecipientId), dummyRecipientData);

      // 友達リクエストを作成（送信済みリクエスト用）
      const requestData = {
        fromUserId: currentUserId,
        toUserId: dummyRecipientId,
        recipientUid: dummyRecipientId,
        recipientName: dummyRecipientData.displayName,
        recipientPhotoURL: dummyRecipientData.photoURL,
        senderMessage: currentUserData?.userShortMessage || "友達になりましょう！",
        status: "pending",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "friendRequests", requestId), requestData);

      alert("ダミー送信友達リクエストを作成しました！");
    } catch (error) {
      console.error("ダミー送信友達リクエスト作成エラー:", error);
      alert("ダミー送信友達リクエストの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  // ダミーフレンドを作成
  const createDummyFriend = async () => {
    if (!currentUserId || isCreating) return;
    setIsCreating(true);

    try {
      const dummyFriendId = `dummy_friend_${Date.now()}`;

      // ダミーフレンドをusersコレクションに作成
      const dummyFriendData = {
        displayName: `フレンド${Math.floor(Math.random() * 1000)}`,
        photoURL: "/vite.svg",
        userShortMessage: "こんにちは！",
        createdAt: serverTimestamp(),
        email: `dummyfriend${Date.now()}@example.com`,
      };

      await setDoc(doc(db, "users", dummyFriendId), dummyFriendData);

      // 相互に友達リストに追加
      await setDoc(doc(db, "users", currentUserId, "friends", dummyFriendId), {
        friendUid: dummyFriendId,
        addedAt: serverTimestamp(),
        status: "accepted",
      });

      await setDoc(doc(db, "users", dummyFriendId, "friends", currentUserId), {
        friendUid: currentUserId,
        addedAt: serverTimestamp(),
        status: "accepted",
      });

      alert("ダミーフレンドを作成しました！");
    } catch (error) {
      console.error("ダミーフレンド作成エラー:", error);
      alert("ダミーフレンドの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  // ダミーデータを全削除
  const deleteAllDummyData = async () => {
    if (!currentUserId || isCreating) return;

    const confirmDelete = window.confirm(
      "すべてのダミーデータを削除しますか？\n" +
        "・ダミーユーザー（dummy_で始まるID）\n" +
        "・関連する友達リクエスト\n" +
        "・友達関係\n\n" +
        "この操作は元に戻せません。"
    );

    if (!confirmDelete) return;

    setIsCreating(true);

    try {
      let deletedCount = 0;

      // 1. ダミーユーザーを削除
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);

      for (const userDoc of usersSnapshot.docs) {
        if (userDoc.id.startsWith("dummy_")) {
          // ユーザーの友達関係も削除
          const friendsQuery = query(collection(db, "users", userDoc.id, "friends"));
          const friendsSnapshot = await getDocs(friendsQuery);

          for (const friendDoc of friendsSnapshot.docs) {
            await deleteDoc(friendDoc.ref);
          }

          // ユーザー自体を削除
          await deleteDoc(userDoc.ref);
          deletedCount++;
        }
      }

      // 2. 現在のユーザーの友達リストからダミーユーザーを削除
      const currentUserFriendsQuery = query(collection(db, "users", currentUserId, "friends"));
      const currentUserFriendsSnapshot = await getDocs(currentUserFriendsQuery);

      for (const friendDoc of currentUserFriendsSnapshot.docs) {
        if (friendDoc.data().friendUid?.startsWith("dummy_")) {
          await deleteDoc(friendDoc.ref);
        }
      }

      // 3. ダミーユーザーに関連する友達リクエストを削除
      const requestsQuery = query(collection(db, "friendRequests"));
      const requestsSnapshot = await getDocs(requestsQuery);

      for (const requestDoc of requestsSnapshot.docs) {
        const requestData = requestDoc.data();
        if (
          requestData.fromUserId?.startsWith("dummy_") ||
          requestData.toUserId?.startsWith("dummy_") ||
          requestData.senderUid?.startsWith("dummy_") ||
          requestData.recipientUid?.startsWith("dummy_")
        ) {
          await deleteDoc(requestDoc.ref);
        }
      }

      alert(`ダミーデータを削除しました！\n削除されたダミーユーザー: ${deletedCount}個`);
    } catch (error) {
      console.error("ダミーデータ削除エラー:", error);
      alert("ダミーデータの削除に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <HeaderComponent2 title="開発ページ" onBackClick={handleBackClick} />
      <div className="p-4 max-w-2xl mx-auto" style={{ paddingTop: "88px" }}>
        {/* 開発ツール説明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-yellow-800 mb-2">⚠️ 開発専用ページ</h2>
          <p className="text-sm text-yellow-700">
            このページは開発・テスト用です。実際のFirebaseデータベースにダミーデータを作成します。
            UIの動作確認やテストに使用してください。作成されたダミーデータは実際のデータとして扱われます。
          </p>
        </div>

        {/* ダミーデータ作成セクション */}
        <div className="space-y-4">
          {/* 受信友達リクエスト作成 */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-md font-semibold mb-2">受信友達リクエスト</h3>
            <p className="text-sm text-gray-600 mb-3">
              他のユーザーからの友達リクエストのダミーデータを作成します。
            </p>
            <button
              type="button"
              onClick={createDummyReceivedRequest}
              disabled={isCreating}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isCreating ? "作成中..." : "ダミー受信リクエストを作成"}
            </button>
          </div>

          {/* 送信友達リクエスト作成 */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-md font-semibold mb-2">送信友達リクエスト</h3>
            <p className="text-sm text-gray-600 mb-3">
              自分が他のユーザーに送った友達リクエストのダミーデータを作成します。
            </p>
            <button
              type="button"
              onClick={createDummySentRequest}
              disabled={isCreating}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isCreating ? "作成中..." : "ダミー送信リクエストを作成"}
            </button>
          </div>

          {/* フレンド作成 */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-md font-semibold mb-2">フレンド</h3>
            <p className="text-sm text-gray-600 mb-3">
              既に友達になっているユーザーのダミーデータを作成します。
            </p>
            <button
              type="button"
              onClick={createDummyFriend}
              disabled={isCreating}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isCreating ? "作成中..." : "ダミーフレンドを作成"}
            </button>
          </div>

          {/* ダミーデータ削除 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-md font-semibold mb-2 text-red-800">🗑️ データ削除</h3>
            <p className="text-sm text-red-700 mb-3">
              作成されたすべてのダミーデータ（ユーザー、友達リクエスト、友達関係）を削除します。
            </p>
            <button
              type="button"
              onClick={deleteAllDummyData}
              disabled={isCreating}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isCreating ? "削除中..." : "すべてのダミーデータを削除"}
            </button>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">📝 使用方法</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 各ボタンをクリックすると実際のFirebaseにダミーデータが作成されます</li>
            <li>• 作成後、ホーム画面でデータが表示されることを確認できます</li>
            <li>• ダミーユーザーは `dummy_` から始まるIDで識別できます</li>
            <li>• UIの動作確認やテストに使用してください</li>
            <li>• 「すべてのダミーデータを削除」ボタンで一括削除できます</li>
            <li>• 削除は元に戻せないので注意してください</li>
          </ul>
        </div>

        {/* 戻るボタン */}
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={handleBackClick}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentPage;
