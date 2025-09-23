import { doc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * ログイン時にユーザーコレクションとサブコレクションを作成/更新する
 * - users: ユーザー情報全体（公開情報 + プライベート情報）
 * - users/{uid}/friends: 友達リスト（オプション）
 */
export const createOrUpdateUser = async (user, friendsData = []) => {
	// 分割代入でユーザー情報を取得（デフォルト値付き）
	const {
		uid,
		displayName = "",
		email = "",
		photoURL = "",
		userShortMessage = "",
	} = user;

	// ユーザー情報全体
	const userData = {
		uid,
		displayName,
		photoURL,
		userShortMessage,
		email, // プライベート情報
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};

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
			{ merge: true },
		);
	} catch (error) {
		console.error("一言メッセージ更新エラー:", error);
		throw error;
	}
};
