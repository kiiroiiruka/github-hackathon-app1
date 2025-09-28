import { useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, getUser, db } from "../firebase";

/**
 * フレンド管理のカスタムフック
 */
export const useFriends = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFriends = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const currentUser = await getUser(user.uid);
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const friendsCollection = collection(db, "users", user.uid, "friends");
      const friendsSnapshot = await getDocs(friendsCollection);
      
      const friendsData = [];
      for (const doc of friendsSnapshot.docs) {
        const friendData = doc.data();
        if (friendData.status === "accepted") {
          const friendInfo = await getUser(friendData.friendUid);
          if (friendInfo) {
            friendsData.push({
              uid: friendInfo.uid,
              name: friendInfo.displayName || friendInfo.name || "名前なし",
              photoURL: friendInfo.photoURL || ""
            });
          }
        }
      }
      
      setFriends(friendsData);
      setError(null);
    } catch (error) {
      console.error("フレンド取得エラー:", error);
      setError("フレンド一覧の取得に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }, []);

  const retryFetch = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchFriends();
  }, [fetchFriends]);

  return { 
    friends, 
    loading, 
    error, 
    fetchFriends, 
    retryFetch 
  };
};

/**
 * フレンド選択管理のカスタムフック
 */
export const useSelectedFriends = () => {
  const [selectedFriends, setSelectedFriends] = useState([]);

  const toggleSelectFriend = useCallback((friend) => {
    setSelectedFriends((prev) =>
      prev.find((f) => f.uid === friend.uid)
        ? prev.filter((f) => f.uid !== friend.uid)
        : [...prev, friend]
    );
  }, []);

  const clearAllSelection = useCallback(() => {
    setSelectedFriends([]);
  }, []);

  return { 
    selectedFriends, 
    toggleSelectFriend, 
    clearAllSelection 
  };
};