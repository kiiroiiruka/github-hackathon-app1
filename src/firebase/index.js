/**
 * Firebase統合関数集
 * すべてのFirebase関連の関数をここからエクスポート
 */

// ================================
// 認証関連
// ================================

export { loginWithGoogle, logout } from "./auth";

// ================================
// ユーザー関連
// ================================

export { createOrUpdateUser, getUser, updateUserMessage, removeFriend } from "./users";

// ================================
// 友達リクエスト関連
// ================================

export {
	acceptFriendRequest,
	getFriendRequests,
	getSentFriendRequests,
	rejectFriendRequest,
	sendFriendRequest,
} from "./friendRequests";

// ================================
// Firebase設定
// ================================

export { auth, db, provider, rtdb } from "./firebaseConfig";

// ================================
// ルーム関連 (Realtime Database)
// ================================
export { createRoomWithInvites } from "./room";

// ================================
// メモ関連 (Firestore)
// ================================
export { addMemo, getMemosByUser, deleteMemo } from "./memos";
