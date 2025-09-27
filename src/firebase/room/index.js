import { push, ref, serverTimestamp, set } from "firebase/database";
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
	if (!currentUser) throw new Error("ログインが必要です");

	try {
		// ルームID作成
		const roomRef = push(ref(rtdb, "rooms"));
		const roomId = roomRef.key;

		// Daily.coのビデオルームを作成
		const dailyResponse = await fetch("/api/daily-room", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				roomId: roomId,
				roomName: roomName,
				ownerUid: currentUser.uid,
			}),
		});

		const dailyResult = await dailyResponse.json();
		if (!dailyResult.success) {
			throw new Error(`Daily room creation failed: ${dailyResult.error}`);
		}

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

		for (const friend of selectedFriends) {
			members[friend.uid] = {
				uid: friend.uid,
				name: friend.name || friend.displayName || "",
				photoURL: friend.photoURL || "",
				invited: true,
				accepted: false, // 初期状態: 未参加
			};
		}

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
		console.log("Room created with Daily integration:", { roomId, dailyRoom: dailyResult.dailyRoom });
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
		const response = await fetch("/api/daily-token", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				roomId: roomId,
				userId: userId,
				userName: userName,
				userPhotoURL: userPhotoURL,
			}),
		});

		const result = await response.json();
		if (!result.success) {
			throw new Error(`Token generation failed: ${result.error}`);
		}

		return result.token;
	} catch (error) {
		console.error("Daily token generation error:", error);
		throw error;
	}
};
