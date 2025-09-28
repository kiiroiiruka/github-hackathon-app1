import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import { LoadingScreen, ErrorScreen } from "../../../components/LoadingError/LoadingError";
import { useAuthState } from "../../../hooks/useAuthState";
import { useAtom } from "jotai";
import { userUidAtom, isLoggedInAtom } from "../../../atom/userAtom";
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";

const Approval = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId, roomName, selectedFriends } = location.state || {};
  
  // 認証状態
  useAuthState();
  const [userUid] = useAtom(userUidAtom);
  const [isLoggedIn] = useAtom(isLoggedInAtom);
  
  // 状態管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sendingRequests, setSendingRequests] = useState(new Set());

  // 承認要求を送信
  const sendApprovalRequest = useCallback(async (friend) => {
    if (!userUid || !friend) return;

    setSendingRequests(prev => new Set(prev).add(friend.uid));

    try {
      const requestData = {
        fromUserId: userUid,
        toUserId: friend.uid,
        roomId: roomId,
        roomName: roomName,
        friendName: friend.name || friend.displayName,
        friendPhotoURL: friend.photoURL || "",
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, "approvalRequests"), requestData);
      
      console.log("承認要求を送信:", friend.name);
      
      // 送信済みリストに追加
      setSentRequests(prev => [...prev, {
        ...requestData,
        id: Date.now().toString(), // 一時的なID
        toUser: friend
      }]);

    } catch (error) {
      console.error("承認要求送信エラー:", error);
      setError("承認要求の送信に失敗しました");
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(friend.uid);
        return newSet;
      });
    }
  }, [userUid, roomId, roomName]);

  // 承認要求に回答
  const respondToRequest = useCallback(async (requestId, response) => {
    try {
      const requestRef = doc(db, "approvalRequests", requestId);
      await updateDoc(requestRef, {
        status: response,
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log("承認要求に回答:", response);

      // ローカル状態を更新
      setReceivedRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: response, respondedAt: new Date() }
            : req
        )
      );

    } catch (error) {
      console.error("承認要求回答エラー:", error);
      setError("承認要求への回答に失敗しました");
    }
  }, []);

  // 送信済み承認要求を取得
  const fetchSentRequests = useCallback(async () => {
    if (!userUid) return;

    try {
      const q = query(
        collection(db, "approvalRequests"),
        where("fromUserId", "==", userUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setSentRequests(requests);
        console.log("送信済み承認要求:", requests.length);
      });

      return unsubscribe;
    } catch (error) {
      console.error("送信済み承認要求取得エラー:", error);
      setError("送信済み承認要求の取得に失敗しました");
    }
  }, [userUid]);

  // 受信した承認要求を取得
  const fetchReceivedRequests = useCallback(async () => {
    if (!userUid) return;

    try {
      const q = query(
        collection(db, "approvalRequests"),
        where("toUserId", "==", userUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setReceivedRequests(requests);
        console.log("受信した承認要求:", requests.length);
      });

      return unsubscribe;
    } catch (error) {
      console.error("受信承認要求取得エラー:", error);
      setError("受信した承認要求の取得に失敗しました");
    }
  }, [userUid]);

  // 初期データ読み込み
  useEffect(() => {
    if (!isLoggedIn || !userUid) return;

    setLoading(true);
    
    Promise.all([
      fetchSentRequests(),
      fetchReceivedRequests()
    ]).then(() => {
      setLoading(false);
    }).catch((error) => {
      console.error("初期データ読み込みエラー:", error);
      setError("データの読み込みに失敗しました");
      setLoading(false);
    });
  }, [isLoggedIn, userUid, fetchSentRequests, fetchReceivedRequests]);

  // ステータス表示用の関数
  const getStatusDisplay = (status) => {
    switch (status) {
      case "pending":
        return { text: "承認待ち", color: "bg-yellow-100 text-yellow-800", icon: "⏳" };
      case "accepted":
        return { text: "承認済み", color: "bg-green-100 text-green-800", icon: "✅" };
      case "rejected":
        return { text: "拒否", color: "bg-red-100 text-red-800", icon: "❌" };
      default:
        return { text: "不明", color: "bg-gray-100 text-gray-800", icon: "❓" };
    }
  };

  const handleBack = () => navigate("/dashboard/navi/confirmation", { state: location.state });

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={() => window.location.reload()} onBack={handleBack} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <HeaderComponent title="通信" />
      
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full mb-4 shadow-lg">
              <span className="text-2xl text-white">🤝</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              承認管理
            </h1>
            <p className="text-gray-600">
              フレンドへの承認要求と受信した要求を管理
            </p>
            {roomName && (
              <div className="mt-2 text-sm text-gray-500">
                ルーム: {roomName}
              </div>
            )}
          </div>

          {/* 招待フレンドへの承認要求送信セクション */}
          {selectedFriends && selectedFriends.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">📤</span>
                承認要求を送信
              </h2>
              
              <div className="grid gap-3">
                {selectedFriends.map((friend) => {
                  const alreadySent = sentRequests.some(req => req.toUserId === friend.uid);
                  const isSending = sendingRequests.has(friend.uid);
                  
                  return (
                    <div
                      key={friend.uid}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={friend.photoURL || "/default-avatar.png"}
                          alt={friend.name || friend.displayName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {friend.name || friend.displayName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {friend.email}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {alreadySent ? (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            送信済み
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => sendApprovalRequest(friend)}
                            disabled={isSending}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSending ? (
                              <>
                                <span className="animate-spin mr-1">⏳</span>
                                送信中...
                              </>
                            ) : (
                              "承認要求を送信"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 送信済み承認要求セクション */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">📋</span>
              送信済み承認要求
            </h2>
            
            {sentRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">📭</span>
                送信した承認要求はありません
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((request) => {
                  const statusInfo = getStatusDisplay(request.status);
                  return (
                    <div
                      key={request.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={request.friendPhotoURL || "/default-avatar.png"}
                            alt={request.friendName}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {request.friendName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.roomName}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 受信した承認要求セクション */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">📥</span>
              受信した承認要求
            </h2>
            
            {receivedRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">📪</span>
                受信した承認要求はありません
              </div>
            ) : (
              <div className="space-y-3">
                {receivedRequests.map((request) => {
                  const statusInfo = getStatusDisplay(request.status);
                  const isPending = request.status === "pending";
                  
                  return (
                    <div
                      key={request.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={request.friendPhotoURL || "/default-avatar.png"}
                            alt={request.friendName}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {request.friendName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ルーム: {request.roomName}
                            </div>
                          </div>
                        </div>
                        
                        <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.text}
                        </span>
                      </div>
                      
                      {isPending && (
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => respondToRequest(request.id, "accepted")}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                          >
                            ✅ 承認する
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToRequest(request.id, "rejected")}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                          >
                            ❌ 拒否する
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <span className="flex items-center gap-2">
                <span>←</span>
                戻る
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Approval;
