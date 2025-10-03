import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * ユーザー情報を取得する
 * @param {string} userId - ユーザーID
 * @returns {object|null} ユーザー情報またはnull
 */
export const getUser = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));

    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data(),
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("ユーザー情報取得エラー:", error);
    throw error;
  }
};

/**
 * ログイン時にユーザーコレクションとサブコレクションを作成/更新する
 * - users: ユーザー情報全体（公開情報 + プライベート情報）
 * - users/{uid}/friends: 友達リスト（オプション）
 */
export const createOrUpdateUser = async (user, friendsData = []) => {
  // 分割代入でユーザー情報を取得（デフォルト値付き）
  const { uid, displayName = "", email = "", photoURL = "", userShortMessage = "" } = user;

  // 既存ユーザーかどうかを確認
  const existingUser = await getUser(uid);

  // ユーザー情報全体
  const userData = {
    uid,
    displayName,
    photoURL,
    userShortMessage,
    email, // プライベート情報
    updatedAt: serverTimestamp(),
  };

  // 新規ユーザーの場合のみcreatedAtを設定
  if (!existingUser) {
    userData.createdAt = serverTimestamp();
  }

  // バッチ書き込みを作成
  const batch = writeBatch(db);

  // 1. ユーザー情報を保存
  batch.set(doc(db, "users", uid), userData, { merge: true });

  // 2. 友達データがある場合、サブコレクションも更新
  if (friendsData?.length > 0) {
    friendsData.forEach((friend) => {
      const {
        uid: friendUid,
        displayName: friendName = "",
        photoURL: friendPhotoURL = "",
      } = friend;

      const friendData = {
        friendUid,
        friendName,
        friendPhotoURL,
        addedAt: serverTimestamp(),
        status: "accepted",
      };

      batch.set(doc(db, "users", uid, "friends", friendUid), friendData, {
        merge: true,
      });
    });
  }

  // バッチを実行
  await batch.commit();
};

/**
 * ユーザーの一言メッセージを更新する
 * @param {string} userId - ユーザーID
 * @param {string} message - 新しい一言メッセージ
 */
export const updateUserMessage = async (userId, message) => {
  try {
    await setDoc(
      doc(db, "users", userId),
      {
        userShortMessage: message,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("一言メッセージ更新エラー:", error);
    throw error;
  }
};

/**
 * フレンドを相互に解除する
 * users/{uid}/friends/{targetUid} と users/{targetUid}/friends/{uid} を削除
 * @param {string} userId - 自分のユーザーID
 * @param {string} targetUserId - 相手のユーザーID
 */
export const removeFriend = async (userId, targetUserId) => {
  if (!userId || !targetUserId) throw new Error("ユーザーIDが不足しています");
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, "users", userId, "friends", targetUserId));
    batch.delete(doc(db, "users", targetUserId, "friends", userId));
    await batch.commit();
  } catch (error) {
    console.error("フレンド解除エラー:", error);
    throw error;
  }
};

/**
 * 検索履歴を保存する（自動的に追加、最新50件まで保持）
 * @param {string} userId - ユーザーID
 * @param {string} name - 場所の名前
 * @param {array} coordinates - 座標 [lat, lng]
 * @returns {boolean} 成功したかどうか
 */
export const addSearchHistory = async (userId, name, coordinates) => {
  if (!userId || !name || !coordinates) {
    console.warn("検索履歴保存: 必須パラメータが不足");
    return false;
  }

  try {
    // タイムスタンプをIDとして使用（ユニーク性を保証）
    const historyId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const historyData = {
      name,
      coordinates,
      searchedAt: serverTimestamp(),
      type: "searchHistory",
    };

    await setDoc(doc(db, "users", userId, "searchHistory", historyId), historyData);
    
    console.log("✅ 検索履歴を保存:", { name, coordinates });
    
    // 古い履歴を削除（50件を超えた場合）
    await cleanupOldSearchHistory(userId, 50);
    
    return true;
  } catch (error) {
    console.error("❌ 検索履歴保存エラー:", error);
    return false;
  }
};

/**
 * 検索履歴を取得する（最新順）
 * @param {string} userId - ユーザーID
 * @param {number} maxResults - 取得する最大件数（デフォルト: 20）
 * @returns {array} 検索履歴の配列
 */
export const getSearchHistory = async (userId, maxResults = 20) => {
  if (!userId) {
    console.warn("検索履歴取得: userIdが不足");
    return [];
  }

  try {
    const historyRef = collection(db, "users", userId, "searchHistory");
    const q = query(historyRef, orderBy("searchedAt", "desc"), limit(maxResults));
    const snapshot = await getDocs(q);
    
    const history = [];
    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return history;
  } catch (error) {
    console.error("❌ 検索履歴取得エラー:", error);
    return [];
  }
};

/**
 * 古い検索履歴を削除する（指定件数を超えた場合）
 * @param {string} userId - ユーザーID
 * @param {number} maxHistoryCount - 保持する最大件数
 */
const cleanupOldSearchHistory = async (userId, maxHistoryCount = 50) => {
  try {
    const historyRef = collection(db, "users", userId, "searchHistory");
    const q = query(historyRef, orderBy("searchedAt", "desc"));
    const snapshot = await getDocs(q);
    
    if (snapshot.size > maxHistoryCount) {
      const batch = writeBatch(db);
      let count = 0;
      
      snapshot.forEach((docSnapshot) => {
        count++;
        if (count > maxHistoryCount) {
          batch.delete(docSnapshot.ref);
        }
      });
      
      await batch.commit();
      console.log(`🗑️ 古い検索履歴を削除: ${snapshot.size - maxHistoryCount}件`);
    }
  } catch (error) {
    console.error("❌ 検索履歴クリーンアップエラー:", error);
  }
};

/**
 * 検索履歴を個別削除する
 * @param {string} userId - ユーザーID
 * @param {string} historyId - 履歴ID
 * @returns {boolean} 成功したかどうか
 */
export const deleteSearchHistory = async (userId, historyId) => {
  if (!userId || !historyId) {
    console.warn("検索履歴削除: userIdまたはhistoryIdが不足");
    return false;
  }

  try {
    await deleteDoc(doc(db, "users", userId, "searchHistory", historyId));
    console.log("✅ 検索履歴を削除しました:", historyId);
    return true;
  } catch (error) {
    console.error("❌ 検索履歴削除エラー:", error);
    return false;
  }
};

/**
 * 検索履歴を全削除する
 * @param {string} userId - ユーザーID
 * @returns {boolean} 成功したかどうか
 */
export const clearSearchHistory = async (userId) => {
  if (!userId) {
    console.warn("検索履歴削除: userIdが不足");
    return false;
  }

  try {
    const historyRef = collection(db, "users", userId, "searchHistory");
    const snapshot = await getDocs(historyRef);
    
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log("✅ 検索履歴を全削除しました");
    return true;
  } catch (error) {
    console.error("❌ 検索履歴削除エラー:", error);
    return false;
  }
};
