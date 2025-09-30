import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";

/**
 * Firestoreから最新の自分の駐車情報を取得する
 * @returns {Promise<Object|null>} 駐車情報オブジェクト（なければnull）
 */
export async function getLatestParkingInfo() {
  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("ユーザー情報が取得できませんでした");
  }

  // ユーザーUIDを直接ドキュメントIDとして使用して取得
  const userDocRef = doc(db, "parkings", user.uid);
  const docSnapshot = await getDoc(userDocRef);

  if (docSnapshot.exists()) {
    return docSnapshot.data();
  } else {
    return null;
  }
}
