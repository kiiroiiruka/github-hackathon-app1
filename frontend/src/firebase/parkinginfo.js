import { getAuth } from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

/**
 * 駐車情報をFirestoreに保存する
 * @param {Object} params
 * @param {Object|null} params.position - {lat, lng} 位置情報
 * @param {Date|null} params.arrivalTime - 到着時刻
 * @param {string} params.departureTime - 出発時刻（datetime-localの値）
 */
export async function saveParkingInfo({ position, arrivalTime, departureTime }) {
  try {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("ユーザー情報が取得できませんでした");
    }

    // ユーザーUIDをドキュメントIDとして使用
    const userDocRef = doc(db, "parkings", user.uid);

    await setDoc(
      userDocRef,
      {
        userId: user.uid,
        position: position ? { lat: position.lat, lng: position.lng } : null,
        arrivalTime: arrivalTime ? arrivalTime.toISOString() : null,
        departureTime: departureTime ? new Date(departureTime).toISOString() : null,
        isDepartureSet: Boolean(departureTime),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(), // 更新時刻も追加
      },
      { merge: true }
    ); // merge: true で既存データがあれば更新、なければ作成
  } catch (error) {
    console.error("駐車情報の保存に失敗:", error);
    throw error;
  }
}
