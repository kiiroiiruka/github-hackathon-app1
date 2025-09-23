import { useAtom } from "jotai";
import { isLoggedInAtom } from "../atom/userAtom";

/**
 * ログイン状態を取得するカスタムフック
 * @returns {boolean} ログイン状態のboolean値
 */
export const useIsLoggedIn = () => {
	const [isLoggedIn] = useAtom(isLoggedInAtom);
	return isLoggedIn;
};
