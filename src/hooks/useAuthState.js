import { onAuthStateChanged } from "firebase/auth";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { isLoggedInAtom, userUidAtom } from "../atom/userAtom";
import { auth } from "../firebase/firebaseConfig";

/**
 * Firebase認証状態を監視し、atomに反映するカスタムフック
 */
export const useAuthState = () => {
	const [, setUserUid] = useAtom(userUidAtom);
	const [, setIsLoggedIn] = useAtom(isLoggedInAtom);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				// ログイン状態の場合
				setUserUid(user.uid);
				setIsLoggedIn(true);
			} else {
				// ログアウト状態の場合
				setUserUid(null);
				setIsLoggedIn(false);
			}
		});

		// クリーンアップ関数
		return () => unsubscribe();
	}, [setUserUid, setIsLoggedIn]);
};
