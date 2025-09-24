import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { auth, getUser, db } from "../../../firebase";
import HeaderComponent2 from "../../../components/Header/Header2";
import Button from "../../../components/Button/Button";

const InviterPreference = () => {
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchFriends = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // 現在のユーザー情報を取得
      const currentUser = await getUser(user.uid);
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // フレンドサブコレクションから友達一覧を取得
      const friendsCollection = collection(db, "users", user.uid, "friends");
      const friendsSnapshot = await getDocs(friendsCollection);
      
      const friendsData = [];
      for (const doc of friendsSnapshot.docs) {
        const friendData = doc.data();
        if (friendData.status === "accepted") {
          // フレンドの最新情報を取得
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

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

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

  const handleConfirm = useCallback(() => {
    if (selectedFriends.length === 0) {
      alert("招待するフレンドを選択してください。");
      return;
    }
    navigate("/dashboard/navi/route-screen", { state: { selectedFriends } });
  }, [selectedFriends, navigate]);

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-600">フレンド一覧を読み込み中...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col justify-center items-center h-screen p-5">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">エラーが発生しました</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchFriends();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-2"
        >
          再試行
        </button>
        <button
          type="button"
          onClick={() => navigate("/dashboard/navi/room")}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          戻る
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col justify-center items-center p-5 h-screen bg-gray-100">
      <HeaderComponent2 title="通信" />
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">招待するユーザー</h1>
        
        {/* 選択済みフレンド表示エリア */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-2">
            <p className="text-gray-600">追加済みのユーザー ({selectedFriends.length}名)</p>
            {selectedFriends.length > 0 && (
              <button
                type="button"
                onClick={clearAllSelection}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                全て削除
              </button>
            )}
          </div>
          <div className="border-2 border-gray-300 rounded-lg p-4 min-h-[80px] w-full">
            {selectedFriends.length === 0 ? (
              <p className="text-gray-400 text-center">フレンドをクリックして追加</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedFriends.map((friend) => (
                  <div key={friend.uid} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    {friend.photoURL ? (
                      <img 
                        src={friend.photoURL} 
                        alt={friend.name} 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">{friend.name?.charAt(0)}</span>
                      </div>
                    )}
                    <span className="text-sm">{friend.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フレンド一覧表示エリア */}
        <div className="w-full">
          <p className="text-gray-600 mb-2">フレンド一覧</p>
          <div className="border-2 border-gray-300 rounded-lg p-4 max-h-[200px] overflow-y-auto w-full">
            {friends.length === 0 ? (
              <p className="text-gray-400 text-center">フレンドが見つかりません</p>
            ) : (
              <div className="flex flex-col gap-1">
                {friends.map((friend) => (
                  <button
                    type="button"
                    key={friend.uid}
                    className={`flex items-center gap-2 p-2 rounded transition-colors w-full text-left ${
                      selectedFriends.find((f) => f.uid === friend.uid)
                        ? "bg-blue-100 border border-blue-300"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => toggleSelectFriend(friend)}
                  >
                    {friend.photoURL ? (
                      <img 
                        src={friend.photoURL} 
                        alt={friend.name} 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">{friend.name?.charAt(0)}</span>
                      </div>
                    )}
                    <span className="text-sm">{friend.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <Button 
            label={`確定 (${selectedFriends.length}名)`}
            onClick={handleConfirm}
          />
          <button
            type="button"
            onClick={() => navigate("/dashboard/navi/room")}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviterPreference;