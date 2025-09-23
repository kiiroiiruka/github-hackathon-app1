import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * ユーザー情報を取得する
 * @param {string} userId - ユーザーID
 * @returns {object|null} ユーザー情報またはnull
 */
export const getUser = async (userId) => {
	try {
		const userDoc = await getDoc(doc(db, "users", userId));

		if (userDoc.exists()) {
			return {
				id: userDoc.id,
				...userDoc.data(),
			};
		} else {
			return null;
		}
	} catch (error) {
		console.error("ユーザー情報取得エラー:", error);
		throw error;
	}
};
