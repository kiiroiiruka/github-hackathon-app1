import { atom } from "jotai";

// ユーザーUIDを管理するatom
export const userUidAtom = atom(null);

// ユーザーのログイン状態を管理するatom
export const isLoggedInAtom = atom(false);

// 現在のユーザー情報を管理するatom
export const currentUserAtom = atom(null);
