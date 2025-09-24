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

export { createOrUpdateUser, getUser, updateUserMessage } from "./users";

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

// ================================
// Daily通話関連
// ================================
export * from "./daily";
export { auth, db, provider, rtdb } from "./firebaseConfig";
// ================================
// ルーム関連 (Realtime Database)
// ================================
export { createRoomWithInvites } from "./room";
