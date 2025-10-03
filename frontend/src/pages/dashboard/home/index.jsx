import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ProfileImage from "@/components/ui/ProfileImage";
import { auth, rtdb } from "@/firebase";

const HomeScreen = () => {
  const navigate = useNavigate();
  const [invitedRooms, setInvitedRooms] = useState([]);
  const [ownedRooms, setOwnedRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(() => {
    const saved = localStorage.getItem("selectedRoom");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setInvitedRooms([]);
      setOwnedRooms([]);
      setSelectedRoom(null);
      localStorage.removeItem("selectedRoom");
      setLoading(false);
      return;
    }

    // Firebase接続の安全性チェック
    if (!rtdb) {
      console.error("Firebase Realtime Database が初期化されていません");
      setLoading(false);
      return;
    }

    let unsubscribe;
    try {
      const roomsRef = ref(rtdb, "rooms");
      unsubscribe = onValue(
        roomsRef,
        (snapshot) => {
          try {
            const value = snapshot.val() || {};
            const list = Object.entries(value).map(([roomId, room]) => ({
              roomId,
              ...room,
            }));
            const invited = list.filter(
              (room) =>
                room?.members?.[currentUser.uid] &&
                room.members[currentUser.uid].invited &&
                !room.members[currentUser.uid].accepted
            );
            const owned = list.filter((room) => room?.ownerUid === currentUser.uid);
            setInvitedRooms(invited);
            setOwnedRooms(owned);

            // 選択中のルームが存在しない場合はクリア
            if (selectedRoom && !list.find((room) => room.roomId === selectedRoom.roomId)) {
              setSelectedRoom(null);
              localStorage.removeItem("selectedRoom");
            }

            setLoading(false);
          } catch (error) {
            console.error("ルームデータの処理中にエラーが発生:", error);
            setLoading(false);
          }
        },
        (error) => {
          console.error("Firebase Realtime Database エラー:", error);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Firebase参照の作成中にエラーが発生:", error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedRoom]);

  const handleAccept = async (roomId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      setUpdatingId(roomId);
      await update(ref(rtdb, `rooms/${roomId}/members/${currentUser.uid}`), {
        accepted: true,
      });
      navigate(`/dashboard/car/${roomId}`);
    } catch (e) {
      console.error("参加更新に失敗:", e);
      alert("参加処理に失敗しました。再試行してください。");
    } finally {
      setUpdatingId("");
    }
  };

  const handleUserIconClick = () => {
    navigate("/dashboard/UserInformation");
  };

  // フレンドページへの遷移処理
  const handleFriendClick = () => {
    navigate("/dashboard/home/friend-page");
  };

  // ルーム選択処理
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    localStorage.setItem("selectedRoom", JSON.stringify(room));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* フレンドボタン */}
          <div className="mb-6">
            <Button
              onClick={handleFriendClick}
              variant="primary"
              size="lg"
              className="w-full"
              icon="👥"
            >
              フレンド
            </Button>
          </div>

          {/* 作成・招待されたルーム */}
          <Card className="mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>🏠</span>
              作成・招待されたルーム
            </h2>
            {loading ? (
              <LoadingSpinner text="ルームを読み込み中..." />
            ) : invitedRooms.length === 0 && ownedRooms.length === 0 ? (
              <EmptyState
                icon="🏠"
                title="ルームがありません"
                description="ルームを作成するか、招待を待ちましょう"
                actionLabel="ルームを作成"
                actionOnClick={() => navigate("/dashboard/navi")}
              />
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-3">
                {/* 招待されたルーム */}
                {invitedRooms.map((room) => (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => handleRoomSelect(room)}
                    className={`w-full text-left border-2 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                      selectedRoom?.roomId === room.roomId
                        ? "bg-blue-50 border-blue-300 shadow-md"
                        : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        <ProfileImage
                          src={room.ownerPhotoURL}
                          alt={room.ownerName || "owner"}
                          className="w-10 h-10 rounded-full"
                          fallbackText={room.ownerName?.charAt(0) || "?"}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base text-gray-800 break-words">
                            {room.name || "(名称未設定)"}
                          </h3>
                          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            招待中
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>作成者: {room.ownerName || "(名称未設定)"}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {/* 作成したルーム */}
                {ownedRooms.map((room) => (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => handleRoomSelect(room)}
                    className={`w-full text-left border border-gray-200 rounded-lg p-2 transition-all duration-200 hover:shadow-md ${
                      selectedRoom?.roomId === room.roomId
                        ? "bg-green-100 border-green-300 shadow-md"
                        : "bg-gradient-to-r from-green-50 to-emerald-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm flex-shrink-0">
                        <ProfileImage
                          src={room.ownerPhotoURL}
                          alt={room.ownerName || "owner"}
                          className="w-8 h-8 rounded-full"
                          fallbackText={room.ownerName?.charAt(0) || "?"}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm text-gray-800 break-words">
                            {room.name || "(名称未設定)"}
                          </h3>
                          <span className="inline-block bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-medium">
                            あなたが作成
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* 選択中のルーム詳細 */}
          {selectedRoom && (invitedRooms.length > 0 || ownedRooms.length > 0) && (
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
                選択中のルーム
              </h2>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                    <ProfileImage
                      src={selectedRoom.ownerPhotoURL}
                      alt={selectedRoom.ownerName || "owner"}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
                      fallbackText={selectedRoom.ownerName?.charAt(0) || "?"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg sm:text-xl text-gray-800 mb-2 break-words">
                      {selectedRoom.name || "(名称未設定)"}
                    </h3>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <p>
                        <span className="font-medium text-gray-700">作成者:</span>{" "}
                        <span className="text-gray-600">
                          {selectedRoom.ownerName || "(名称未設定)"}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">ルームID:</span>{" "}
                        <span className="font-mono bg-white px-2 py-1 rounded border text-gray-800 text-xs break-all">
                          {selectedRoom.roomId}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">作成時刻:</span>{" "}
                        <span className="text-gray-600">
                          {selectedRoom.createdAt
                            ? new Date(selectedRoom.createdAt).toLocaleString("ja-JP")
                            : "-"}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">種別:</span>
                        <span
                          className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                            selectedRoom.ownerUid === auth.currentUser?.uid
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {selectedRoom.ownerUid === auth.currentUser?.uid
                            ? "あなたが作成"
                            : "招待中"}
                        </span>
                      </p>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      {selectedRoom.ownerUid === auth.currentUser?.uid ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/car/${selectedRoom.roomId}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
                        >
                          <span>🗺️</span>カーナビへ移動
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAccept(selectedRoom.roomId)}
                          disabled={updatingId === selectedRoom.roomId}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
                        >
                          {updatingId === selectedRoom.roomId ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              処理中...
                            </>
                          ) : (
                            <>
                              <span>🚗</span>ルームに参加
                            </>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedRoom(null)}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
                      >
                        選択解除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
