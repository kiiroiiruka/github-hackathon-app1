import { onValue, ref, update } from "firebase/database";
import { rtdb } from "./firebaseConfig";

// Daily room state management in Realtime Database
export const syncDailyRoomState = (roomId, dailyRoomData) => {
	const roomRef = ref(rtdb, `rooms/${roomId}/dailyRoom`);
	return update(roomRef, {
		dailyRoomId: dailyRoomData.id,
		dailyRoomUrl: dailyRoomData.url,
		createdAt: Date.now(),
		status: "active",
	});
};

// Update member's Daily participation status
export const updateMemberDailyStatus = (roomId, userId, isInCall = true) => {
	const memberRef = ref(rtdb, `rooms/${roomId}/members/${userId}`);
	return update(memberRef, {
		inDailyCall: isInCall,
		lastCallUpdate: Date.now(),
	});
};

// Listen to Daily room state changes
export const listenToDailyRoomState = (roomId, callback) => {
	const roomRef = ref(rtdb, `rooms/${roomId}/dailyRoom`);
	return onValue(roomRef, callback);
};

// Listen to member Daily participation status
export const listenToMemberDailyStatus = (roomId, callback) => {
	const membersRef = ref(rtdb, `rooms/${roomId}/members`);
	return onValue(membersRef, callback);
};

// End Daily room session
export const endDailyRoomSession = (roomId) => {
	const roomRef = ref(rtdb, `rooms/${roomId}/dailyRoom`);
	return update(roomRef, {
		status: "ended",
		endedAt: Date.now(),
	});
};

// Get Daily room info
export const getDailyRoomInfo = (roomId) => {
	return new Promise((resolve, reject) => {
		const roomRef = ref(rtdb, `rooms/${roomId}/dailyRoom`);
		const unsubscribe = onValue(
			roomRef,
			(snapshot) => {
				const data = snapshot.val();
				unsubscribe();
				resolve(data);
			},
			(error) => {
				unsubscribe();
				reject(error);
			},
		);
	});
};
