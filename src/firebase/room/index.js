import { get, push, ref, serverTimestamp, set } from "firebase/database";
import { auth, rtdb } from "../firebaseConfig";

/**
 * ルームを作成し、選択されたユーザーを招待メンバーとして保存する（Realtime Database）
 * 同時にDaily.coのビデオルームも作成する
 * rooms/{roomId}
 *  - name: ルーム名
 *  - createdAt: タイムスタンプ
 *  - ownerUid: 作成者UID
 *  - dailyRoom: { id, name, url } - Daily.coルーム情報
 *  - members: { [uid]: { uid, name, photoURL, invited: true, accepted: false } }
 * @param {string} roomName
 * @param {Array<{uid:string,name:string,photoURL?:string}>} selectedFriends
 * @returns {Promise<string>} 新規roomId
 */
export const createRoomWithInvites = async (roomName, selectedFriends = []) => {
	const currentUser = auth.currentUser;
	if (!currentUser || !currentUser.uid) {
		throw new Error("ログインが必要です。ユーザー情報を取得できません。");
	}

	console.log("Room creation - Current User:", {
		uid: currentUser.uid,
		displayName: currentUser.displayName,
		email: currentUser.email,
	});

	try {
		// ルームID作成
		const roomRef = push(ref(rtdb, "rooms"));
		const roomId = roomRef.key;

		// Daily.coのビデオルーム作成を一時的に無効化（参考プロジェクトの成功パターンに合わせる）
		// TODO: 後でDaily.co統合を追加
		const dailyResult = {
			success: true,
			dailyRoom: {
				id: roomId,
				name: roomName,
				url: `https://test.daily.co/${roomId}`, // 仮のURL
			},
		};

		// メンバー一覧: 作成者も含める（デフォルトaccepted: true）
		const members = {
			[currentUser.uid]: {
				uid: currentUser.uid,
				name: currentUser.displayName || "",
				photoURL: currentUser.photoURL || "",
				invited: true,
				accepted: true,
			},
		};

		console.log("Room creation - Owner member data:", members[currentUser.uid]);

		for (const friend of selectedFriends) {
			members[friend.uid] = {
				uid: friend.uid,
				name: friend.name || friend.displayName || "",
				photoURL: friend.photoURL || "",
				invited: true,
				accepted: false, // 初期状態: 未参加
			};
		}

		console.log("Room creation - All members:", members);

		const roomData = {
			name: roomName,
			createdAt: serverTimestamp(),
			ownerUid: currentUser.uid,
			ownerName: currentUser.displayName || "",
			ownerPhotoURL: currentUser.photoURL || "",
			dailyRoom: dailyResult.dailyRoom, // Daily.coルーム情報を追加
			members,
		};

		await set(roomRef, roomData);
		console.log("Room created with Daily integration:", {
			roomId,
			dailyRoom: dailyResult.dailyRoom,
			ownerUid: currentUser.uid,
			membersCount: Object.keys(roomData.members).length,
		});
		console.log("Room data saved:", roomData);
		return roomId;
	} catch (error) {
		console.error("Room creation error:", error);
		throw error;
	}
};

/**
 * Daily.coの参加トークンを取得する
 * @param {string} roomId Firebase room ID
 * @param {string} userId User ID
 * @param {string} userName User name
 * @param {string} userPhotoURL User photo URL
 * @returns {Promise<string>} Daily.co参加トークン
 */
export const getDailyToken = async (roomId, userId, userName, userPhotoURL) => {
	try {
		// Daily.co トークン生成を一時的に無効化（参考プロジェクトの成功パターンに合わせる）
		// TODO: 後でDaily.co統合を追加
		const mockToken = `mock_token_${roomId}_${userId}`;
		console.log("Mock Daily token generated:", mockToken);
		return mockToken;
	} catch (error) {
		console.error("Daily token generation error:", error);
		throw error;
	}
};

/**
 * 通話セッションを開始する
 * @param {string} roomId Firebase room ID
 * @param {string} userId User ID
 * @param {Object} participantInfo 参加者情報
 */
export const startCallSession = async (
	roomId,
	userId,
	participantInfo = {},
) => {
	try {
		const sessionData = {
			joinedAt: serverTimestamp(),
			isActive: true,
			participantInfo: {
				name: participantInfo.name || "Anonymous",
				photoURL: participantInfo.photoURL || "",
				sessionId: participantInfo.sessionId || "",
			},
			callDuration: 0,
		};

		// セッションデータを保存
		const sessionRef = ref(rtdb, `rooms/${roomId}/sessions/${userId}`);
		await set(sessionRef, sessionData);

		// 参加者の通話状態を更新
		const memberRef = ref(rtdb, `rooms/${roomId}/members/${userId}/inCall`);
		await set(memberRef, true);

		console.log("Call session started:", { roomId, userId });
	} catch (error) {
		console.error("Failed to start call session:", error);
		throw error;
	}
};

/**
 * 通話セッションを終了する
 * @param {string} roomId Firebase room ID
 * @param {string} userId User ID
 * @param {number} callDuration 通話時間（秒）
 */
export const endCallSession = async (roomId, userId, callDuration = 0) => {
	try {
		// セッションデータを更新
		const sessionRef = ref(rtdb, `rooms/${roomId}/sessions/${userId}`);
		const sessionData = {
			leftAt: serverTimestamp(),
			isActive: false,
			callDuration: callDuration,
		};

		await set(sessionRef, sessionData);

		// 参加者の通話状態を更新
		const memberRef = ref(rtdb, `rooms/${roomId}/members/${userId}/inCall`);
		await set(memberRef, false);

		// 通話履歴を保存
		const historyRef = ref(
			rtdb,
			`rooms/${roomId}/callHistory/${userId}/${Date.now()}`,
		);
		await set(historyRef, {
			duration: callDuration,
			endedAt: serverTimestamp(),
		});

		console.log("Call session ended:", { roomId, userId, callDuration });
	} catch (error) {
		console.error("Failed to end call session:", error);
		throw error;
	}
};

/**
 * 通話時間を更新する
 * @param {string} roomId Firebase room ID
 * @param {string} userId User ID
 * @param {number} duration 通話時間（秒）
 */
export const updateCallDuration = async (roomId, userId, duration) => {
	try {
		const sessionRef = ref(
			rtdb,
			`rooms/${roomId}/sessions/${userId}/callDuration`,
		);
		await set(sessionRef, duration);
	} catch (error) {
		console.error("Failed to update call duration:", error);
	}
};
