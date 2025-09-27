import { getFirestore, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

    const q = query(
        collection(db, "parkings"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
    } else {
        return null;
    }
}