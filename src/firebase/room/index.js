import {
	get,
	onValue,
	push,
	ref,
	serverTimestamp,
	set,
} from "firebase/database";
import { auth, rtdb } from "../firebaseConfig";

/**
 * ルームを作成し、選択されたユーザーを招待メンバーとして保存する（Realtime Database）
 * rooms/{roomId}
 *  - name: ルーム名
 *  - createdAt: タイムスタンプ
 *  - ownerUid: 作成者UID
 *  - members: { [uid]: { uid, name, photoURL, invited: true, accepted: false } }
 * @param {string} roomName
 * @param {Array<{uid:string,name:string,photoURL?:string}>} selectedFriends
 * @returns {Promise<string>} 新規roomId
 */
export const createRoomWithInvites = async (roomName, selectedFriends = []) => {
	const currentUser = auth.currentUser;
	if (!currentUser) throw new Error("ログインが必要です");

	// ルームID作成
	const roomRef = push(ref(rtdb, "rooms"));
	const roomId = roomRef.key;

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
		members,
	};

	await set(roomRef, roomData);
	return roomId;
};

/**
 * 招待中（invited === true かつ accepted === false）のメンバー一覧を購読
 * @param {string} roomId
 * @param {(members: Array<{uid:string,name?:string,photoURL?:string,invited:boolean,accepted:boolean}>) => void} callback
 * @returns {() => void} unsubscribe function
 */
export const subscribeInvitedMembers = (roomId, callback) => {
	const membersRef = ref(rtdb, `rooms/${roomId}/members`);
	const unsubscribe = onValue(membersRef, (snapshot) => {
		const value = snapshot.val() || {};
		const list = Object.values(value).filter((m) => m?.invited && !m?.accepted);
		callback(list);
	});
	return unsubscribe;
};

/**
 * 招待中（invited === true かつ accepted === false）のメンバー一覧を単発取得
 * @param {string} roomId
 * @returns {Promise<Array<{uid:string,name?:string,photoURL?:string,invited:boolean,accepted:boolean}>>}
 */
export const getInvitedMembersOnce = async (roomId) => {
	const membersRef = ref(rtdb, `rooms/${roomId}/members`);
	const snapshot = await get(membersRef);
	const value = snapshot.val() || {};
	return Object.values(value).filter((m) => m?.invited && !m?.accepted);
};

/**
 * 参加中（accepted === true）のメンバー一覧を購読
 * @param {string} roomId
 * @param {(members: Array<{uid:string,name?:string,photoURL?:string,invited:boolean,accepted:boolean}>) => void} callback
 * @returns {() => void} unsubscribe function
 */
export const subscribeAcceptedMembers = (roomId, callback) => {
	const membersRef = ref(rtdb, `rooms/${roomId}/members`);
	const unsubscribe = onValue(membersRef, (snapshot) => {
		const value = snapshot.val() || {};
		const list = Object.values(value).filter((m) => m?.accepted);
		callback(list);
	});
	return unsubscribe;
};

/**
 * 不参加（accepted === false）のメンバー一覧を購読（招待済み/未参加の両方を含む）
 * @param {string} roomId
 * @param {(members: Array<{uid:string,name?:string,photoURL?:string,invited:boolean,accepted:boolean}>) => void} callback
 * @returns {() => void} unsubscribe function
 */
export const subscribeAbsentMembers = (roomId, callback) => {
	const membersRef = ref(rtdb, `rooms/${roomId}/members`);
	const unsubscribe = onValue(membersRef, (snapshot) => {
		const value = snapshot.val() || {};
		const list = Object.values(value).filter((m) => m && m.accepted === false);
		callback(list);
	});
	return unsubscribe;
};

/**
 * 参加中（accepted === true）のメンバー一覧を単発取得
 * @param {string} roomId
 * @returns {Promise<Array<{uid:string,name?:string,photoURL?:string,invited:boolean,accepted:boolean}>>}
 */
export const getAcceptedMembersOnce = async (roomId) => {
	const membersRef = ref(rtdb, `rooms/${roomId}/members`);
	const snapshot = await get(membersRef);
	const value = snapshot.val() || {};
	return Object.values(value).filter((m) => m?.accepted);
};

/**
 * 不参加（accepted === false）のメンバー一覧を単発取得
 * @param {string} roomId
 * @returns {Promise<Array<{uid:string,name?:string,photoURL?:string,invited:boolean,accepted:boolean}>>}
 */
export const getAbsentMembersOnce = async (roomId) => {
	const membersRef = ref(rtdb, `rooms/${roomId}/members`);
	const snapshot = await get(membersRef);
	const value = snapshot.val() || {};
	return Object.values(value).filter((m) => m && m.accepted === false);
};
