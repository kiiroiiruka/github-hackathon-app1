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

		// Daily.coのビデオルームを作成
		const apiBaseUrl = ""; // 本番環境のエンドポイント
		const dailyResponse = await fetch(`${apiBaseUrl}/api/daily-room`, {
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
		// 開発環境と本番環境でAPIエンドポイントを分岐
		const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === "development";
		const apiBaseUrl = isDevelopment 
			? "http://localhost:8787"  // ローカル開発環境（Cloudflare Workers）
			: ""; // 本番環境のエンドポイント（Cloudflare Pages Functions - 相対パス）

		console.log("🔗 Daily token API request:", {
			apiBaseUrl,
			isDevelopment,
			env: {
				DEV: import.meta.env.DEV,
				NODE_ENV: import.meta.env.NODE_ENV,
				MODE: import.meta.env.MODE
			},
			roomId,
			userId,
			userName
		});

		// APIエンドポイントが利用できない場合のフォールバック
		if (!apiBaseUrl) {
			console.warn("⚠️ APIエンドポイントが設定されていません。フォールバックトークンを使用します。");
			// フォールバック用のダミートークン（実際の通話はできませんが、エラーを防ぎます）
			return `fallback-token-${roomId}-${userId}-${Date.now()}`;
		}

		const response = await fetch(`${apiBaseUrl}/api/daily-token`, {
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

		// レスポンスの状態をチェック
		if (!response.ok) {
			const errorText = await response.text();
			console.error("❌ API Response Error:", {
				status: response.status,
				statusText: response.statusText,
				body: errorText
			});
			
			// 開発環境でAPIが利用できない場合のフォールバック
			if (isDevelopment && response.status === 404) {
				console.warn("⚠️ APIエンドポイントが見つかりません。フォールバックトークンを使用します。");
				return `fallback-token-${roomId}-${userId}-${Date.now()}`;
			}
			
			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		if (!result.success) {
			throw new Error(`Token generation failed: ${result.error}`);
		}

		console.log("✅ Daily token generated successfully");
		return result.token;
	} catch (error) {
		console.error("❌ Daily token generation error:", error);
		
		// ネットワークエラーやAPIエンドポイントが利用できない場合のフォールバック
		const isDevelopment = import.meta.env.DEV;
		const isNetworkError = error.message.includes('Failed to fetch') || 
							  error.message.includes('404') || 
							  error.message.includes('ERR_CONNECTION_REFUSED') ||
							  error.message.includes('NetworkError') ||
							  error.message.includes('TypeError');
		
		if (isNetworkError) {
			console.warn("⚠️ APIエンドポイントにアクセスできません。フォールバックトークンを使用します。");
			if (isDevelopment) {
				console.warn("💡 Cloudflare Workersの開発サーバーを起動してください: cd functions && npx wrangler dev --port 8787");
			} else {
				console.warn("💡 本番環境では、Cloudflare Pages Functionsが正しく設定されているか確認してください。");
				console.warn("💡 functions/api/daily-token.js が正しくデプロイされているか確認してください。");
			}
			return `fallback-token-${roomId}-${userId}-${Date.now()}`;
		}
		
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
