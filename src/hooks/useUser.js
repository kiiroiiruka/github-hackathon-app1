import { useAtom } from "jotai";
import { isLoggedInAtom, currentUserAtom } from "../atom/userAtom";

/**
 * ログイン状態を取得するカスタムフック
 * @returns {boolean} ログイン状態のboolean値
 */
export const useIsLoggedIn = () => {
	const [isLoggedIn] = useAtom(isLoggedInAtom);
	return isLoggedIn;
};

/**
 * 現在のユーザー情報を取得するカスタムフック
 * @returns {Object|null} 現在のユーザー情報（uid, displayName, email, photoURL）
 */
export const useCurrentUser = () => {
	const [currentUser] = useAtom(currentUserAtom);
	return currentUser;
};
