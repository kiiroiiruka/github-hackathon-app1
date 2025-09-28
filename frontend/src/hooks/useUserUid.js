import { useAtom } from "jotai";
import { userUidAtom } from "../atom/userAtom";

/**
 * ユーザーUIDを取得するカスタムフック
 * @returns {string|null} ユーザーのUID、未ログインの場合はnull
 */
export const useUserUid = () => {
	const [userUid] = useAtom(userUidAtom);
	return userUid;
};
