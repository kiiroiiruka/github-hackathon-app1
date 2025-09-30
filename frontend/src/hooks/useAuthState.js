import { onAuthStateChanged } from "firebase/auth";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { auth } from "@/firebase";
import { currentUserAtom, isLoggedInAtom, userUidAtom } from "../atom/userAtom";

/**
 * Firebase認証状態を監視し、atomに反映するカスタムフック
 */
export const useAuthState = () => {
  const [, setUserUid] = useAtom(userUidAtom);
  const [, setIsLoggedIn] = useAtom(isLoggedInAtom);
  const [, setCurrentUser] = useAtom(currentUserAtom);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ログイン状態の場合
        setUserUid(user.uid);
        setIsLoggedIn(true);
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
      } else {
        // ログアウト状態の場合
        setUserUid(null);
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    });

    // クリーンアップ関数
    return () => unsubscribe();
  }, [setUserUid, setIsLoggedIn, setCurrentUser]);
};
