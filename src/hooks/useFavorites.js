import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { userUidAtom, isLoggedInAtom } from "../atom/userAtom";
import { 
  getUserFavorites, 
  addUserFavorite, 
  removeUserFavorite, 
  removeAllUserFavorites,
  migrateFavoritesFromLocalStorage 
} from "../firebase/map";

/**
 * お気に入り場所を管理するカスタムフック
 * @returns {Object} お気に入り管理の状態と関数
 */
export const useFavorites = () => {
  const [userUid] = useAtom(userUidAtom);
  const [isLoggedIn] = useAtom(isLoggedInAtom);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // お気に入りを読み込む
  const loadFavorites = useCallback(async () => {
    if (!isLoggedIn || !userUid) {
      // ログインしていない場合はローカルストレージから読み込み
      const localFavorites = localStorage.getItem('favoriteLocations');
      if (localFavorites) {
        try {
          const parsedFavorites = JSON.parse(localFavorites);
          setFavorites(parsedFavorites);
        } catch (error) {
          console.error('ローカルお気に入りの読み込みエラー:', error);
          setError('ローカルお気に入りの読み込みに失敗しました');
        }
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userFavorites = await getUserFavorites(userUid);
      setFavorites(userFavorites);
    } catch (err) {
      console.error('お気に入りの読み込みエラー:', err);
      setError('お気に入りの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [userUid, isLoggedIn]);

  // お気に入りを追加
  const addFavorite = useCallback(async (name, coordinates) => {
    if (!name || !coordinates) {
      setError('名前と座標は必須です');
      return false;
    }

    if (!isLoggedIn || !userUid) {
      // ログインしていない場合はローカルストレージに保存
      const newFavorite = {
        id: Date.now(),
        name: name,
        coordinates: coordinates,
        addedAt: new Date().toISOString()
      };
      
      const updatedFavorites = [...favorites, newFavorite];
      setFavorites(updatedFavorites);
      localStorage.setItem('favoriteLocations', JSON.stringify(updatedFavorites));
      console.log("ローカルお気に入りに追加:", name);
      return true;
    }

    setError(null);

    try {
      const docId = await addUserFavorite(userUid, name, coordinates);
      if (docId) {
        // 成功した場合、リストを再読み込み
        await loadFavorites();
        return true;
      } else {
        console.log("重複のため追加されませんでした:", name);
        return false;
      }
    } catch (err) {
      console.error('お気に入りの追加エラー:', err);
      setError('お気に入りの追加に失敗しました');
      return false;
    }
  }, [userUid, isLoggedIn, favorites, loadFavorites]);

  // お気に入りを削除
  const removeFavorite = useCallback(async (favoriteId) => {
    if (!favoriteId) {
      setError('お気に入りIDが必要です');
      return false;
    }

    if (!isLoggedIn || !userUid) {
      // ログインしていない場合はローカルストレージから削除
      const updatedFavorites = favorites.filter(f => f.id !== favoriteId);
      setFavorites(updatedFavorites);
      
      if (updatedFavorites.length === 0) {
        localStorage.removeItem('favoriteLocations');
      } else {
        localStorage.setItem('favoriteLocations', JSON.stringify(updatedFavorites));
      }
      console.log('ローカルお気に入りから削除:', favoriteId);
      return true;
    }

    setError(null);

    try {
      await removeUserFavorite(favoriteId);
      // 成功した場合、リストを再読み込み
      await loadFavorites();
      return true;
    } catch (err) {
      console.error('お気に入りの削除エラー:', err);
      setError('お気に入りの削除に失敗しました');
      return false;
    }
  }, [userUid, isLoggedIn, favorites, loadFavorites]);

  // お気に入りを全削除
  const removeAllFavorites = useCallback(async () => {
    if (!isLoggedIn || !userUid) {
      // ログインしていない場合はローカルストレージをクリア
      setFavorites([]);
      localStorage.removeItem('favoriteLocations');
      console.log('ローカルお気に入りを全削除');
      return true;
    }

    setError(null);

    try {
      await removeAllUserFavorites(userUid);
      setFavorites([]);
      return true;
    } catch (err) {
      console.error('お気に入りの全削除エラー:', err);
      setError('お気に入りの全削除に失敗しました');
      return false;
    }
  }, [userUid, isLoggedIn]);

  // ローカルストレージからFirebaseに移行
  const migrateFromLocalStorage = useCallback(async () => {
    if (!isLoggedIn || !userUid) {
      return 0;
    }

    try {
      const migratedCount = await migrateFavoritesFromLocalStorage(userUid);
      if (migratedCount > 0) {
        await loadFavorites();
      }
      return migratedCount;
    } catch (err) {
      console.error('お気に入りの移行エラー:', err);
      setError('お気に入りの移行に失敗しました');
      return 0;
    }
  }, [userUid, isLoggedIn, loadFavorites]);

  // ログイン状態が変わった時にお気に入りを読み込み
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // ログイン直後にローカルストレージから移行
  useEffect(() => {
    if (isLoggedIn && userUid) {
      migrateFromLocalStorage();
    }
  }, [isLoggedIn, userUid, migrateFromLocalStorage]);

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    removeAllFavorites,
    loadFavorites,
    migrateFromLocalStorage
  };
};