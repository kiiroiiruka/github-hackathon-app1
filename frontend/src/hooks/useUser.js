import { useAtom } from "jotai";
import { auth } from "@/firebase";
import { currentUserAtom, isLoggedInAtom } from "../atom/userAtom";

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

/**
 * ユーザー名からGoogle認証のphotoURLを取得する関数
 * @param {string} userName ユーザー名
 * @returns {string|null} Google認証のphotoURL（見つからない場合はnull）
 */
export const getGooglePhotoURL = (userName) => {
  const currentUser = auth.currentUser;
  if (currentUser && currentUser.displayName === userName && currentUser.photoURL) {
    return currentUser.photoURL;
  }
  return null;
};
