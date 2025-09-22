import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * ログイン時にユーザーコレクションを作成/更新する
 * - userPublic: 他ユーザーに表示可能な最小限の情報
 * - userPrivate: 本人のみ参照可能な情報
 */
export const createOrUpdateUser = async (user) => {
	const uid = user.uid;
	const displayName = user.displayName || "";
	const email = user.email || "";
	const photoURL = user.photoURL || "";

	const publicData = {
		uid,
		displayName,
		photoURL,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};

	const privateData = {
		uid,
		email,
		displayName,
		photoURL,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};

	const batch = [];

	// userPublic コレクション（他ユーザーに表示）
	batch.push(
		setDoc(doc(db, "userPublic", uid), publicData, {
			merge: true,
		}),
	);

	// userPrivate コレクション（本人のみ）
	batch.push(
		setDoc(doc(db, "userPrivate", uid), privateData, {
			merge: true,
		}),
	);

	await Promise.all(batch);
};
