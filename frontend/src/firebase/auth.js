import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "./firebaseConfig";
import { createOrUpdateUser } from "./users";

export const loginWithGoogle = async () => {
	try {
		const result = await signInWithPopup(auth, provider);
		// ログイン成功時にユーザーコレクションを作成/更新
		await createOrUpdateUser(result.user);
		// ユーザー情報はonAuthStateChangedで自動的にatomに反映される
		return result;
	} catch (error) {
		console.error("Google sign-in failed", error);
		throw error;
	}
};

export const logout = async () => {
	try {
		await signOut(auth);
		// ログアウト成功時、onAuthStateChangedで自動的にatomがクリアされる
		console.log("ログアウトしました");
	} catch (error) {
		console.error("ログアウトに失敗しました", error);
		throw error;
	}
};
