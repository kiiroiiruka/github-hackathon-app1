import {
	collection,
	deleteDoc,
	doc,
	getDocs,
	query,
	serverTimestamp,
	setDoc,
	where,
	writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getUser } from "../users/getUser";

/**
 * 友達リクエストを送信する
 * @param {string} fromUserId - 送信者のユーザーID
 * @param {string} toUserId - 受信者のユーザーID
 * @param {object} senderData - 送信者の情報
 */
export const sendFriendRequest = async (fromUserId, toUserId, senderData) => {
	const requestId = `${fromUserId}_${toUserId}`;

	const requestData = {
		fromUserId,
		toUserId,
		senderName: senderData.displayName || "",
		senderPhotoURL: senderData.photoURL || "",
		senderUid: fromUserId,
		senderMessage: senderData.userShortMessage || "", // 送信者の一言メッセージ
		senderCreatedAt: senderData.createdAt || null, // 送信者のアカウント作成日
		status: "pending",
		createdAt: serverTimestamp(),
	};

	await setDoc(doc(db, "friendRequests", requestId), requestData);
};

/**
 * 友達リクエストを取得する（受信者用）
 * @param {string} userId - ユーザーID
 */
export const getFriendRequests = async (userId) => {
	const q = query(
		collection(db, "friendRequests"),
		where("toUserId", "==", userId),
		where("status", "==", "pending"),
	);

	const querySnapshot = await getDocs(q);

	// 各リクエストの送信者情報を取得
	const requestsWithUserData = await Promise.all(
		querySnapshot.docs.map(async (doc) => {
			const requestData = doc.data();
			const senderInfo = await getUser(requestData.fromUserId);

			return {
				id: doc.id,
				...requestData,
				// 送信者の最新情報で上書き
				senderName: senderInfo?.displayName || requestData.senderName,
				senderPhotoURL: senderInfo?.photoURL || requestData.senderPhotoURL,
				senderMessage: requestData.senderMessage || "", // 一言メッセージも含める
				senderCreatedAt: requestData.senderCreatedAt || null, // アカウント作成日も含める
			};
		}),
	);

	return requestsWithUserData;
};

/**
 * 友達リクエストを承認する
 * @param {string} requestId - リクエストID
 * @param {string} fromUserId - 送信者のユーザーID
 * @param {string} toUserId - 受信者のユーザーID
 */
export const acceptFriendRequest = async (requestId, fromUserId, toUserId) => {
	// 友達リストに追加
	const batch = writeBatch(db);

	batch.set(
		doc(db, "users", fromUserId, "friends", toUserId),
		{
			friendUid: toUserId,
			addedAt: serverTimestamp(),
			status: "accepted",
		},
		{ merge: true },
	);

	batch.set(
		doc(db, "users", toUserId, "friends", fromUserId),
		{
			friendUid: fromUserId,
			addedAt: serverTimestamp(),
			status: "accepted",
		},
		{ merge: true },
	);

	await batch.commit();

	// リクエストを削除（クリーンな状態を保つ）
	await deleteDoc(doc(db, "friendRequests", requestId));
};

/**
 * 友達リクエストを拒否する
 * @param {string} requestId - リクエストID
 */

export const rejectFriendRequest = async (requestId) => {
	await setDoc(
		doc(db, "friendRequests", requestId),
		{
			status: "rejected",
			rejectedAt: serverTimestamp(),
		},
		{ merge: true },
	);
};
