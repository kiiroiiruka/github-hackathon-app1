import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * ユーザーのメモを作成
 * @param {string} userId
 * @param {{title: string, content: string}} payload
 * @returns {Promise<string>} 作成されたメモID
 */
export const addMemo = async (userId, payload) => {
  const { title, content } = payload;
  const colRef = collection(db, "users", userId, "memos");
  const docRef = await addDoc(colRef, {
    title,
    content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * ユーザーのメモ一覧を更新日時降順で取得
 * @param {string} userId
 * @returns {Promise<Array<{id:string,title:string,content:string,createdAt:number,updatedAt:number}>>}
 */
export const getMemosByUser = async (userId) => {
  const colRef = collection(db, "users", userId, "memos");
  const q = query(colRef, orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
    const updatedAtMs = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : createdAtMs;
    return {
      id: d.id,
      title: data.title || "",
      content: data.content || "",
      createdAt: createdAtMs,
      updatedAt: updatedAtMs,
    };
  });
};

/**
 * ユーザーのメモを削除
 * @param {string} userId
 * @param {string} memoId
 */
export const deleteMemo = async (userId, memoId) => {
  const targetRef = doc(db, "users", userId, "memos", memoId);
  await deleteDoc(targetRef);
};


