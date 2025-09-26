import { useLocation, useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import ActionButton from "../../../components/RoomCreation/ActionButton";

const Confirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId, roomName, selectedFriends, selectedLocation } = location.state || {};
  
  // デバッグ情報
  console.log("Confirmation - 全体のlocation.state:", location.state);
  console.log("Confirmation - selectedFriends:", selectedFriends);
  console.log("Confirmation - selectedFriendsの型:", typeof selectedFriends);
  console.log("Confirmation - selectedFriendsの長さ:", selectedFriends?.length);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-100">
      <HeaderComponent title="通信" />
      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* 成功メッセージ */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ルーム作成完了！
            </h1>
            <p className="text-gray-600">
              ルームが正常に作成されました
            </p>
          </div>

          {/* ルーム情報 */}
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🏠 作成されたルーム
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-blue-500 font-medium">ルーム名:</span>
                <span className="text-gray-800">{roomName || "未設定"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-500 font-medium">ルームID:</span>
                <span className="text-gray-600 text-sm font-mono">{roomId || "不明"}</span>
              </div>
              {selectedLocation && (
                <div>
                  <span className="text-blue-500 font-medium">目的地:</span>
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">📍</span>
                      <span className="font-medium text-green-800">{selectedLocation.name}</span>
                    </div>
                    <p className="text-sm text-green-600">
                      緯度: {selectedLocation.coordinates[0].toFixed(4)}, 
                      経度: {selectedLocation.coordinates[1].toFixed(4)}
                    </p>
                  </div>
                </div>
              )}
              {selectedFriends && selectedFriends.length > 0 && (
                <div>
                  <span className="text-blue-500 font-medium">招待メンバー:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFriends.map((friend, index) => (
                      <span
                        key={friend.uid || index}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                      >
                        {friend.displayName || friend.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="space-y-4">
            <ActionButton
              onClick={() => navigate("/dashboard/navi/route-screen", {
                state: { 
                  roomId, 
                  roomName,
                  destination: selectedLocation?.coordinates,
                  destinationName: selectedLocation?.name,
                  selectedFriends
                }
              })}
              disabled={!selectedLocation}
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-2xl">🗺️</span>
                {selectedLocation ? "ルートを確認する" : "目的地が設定されていません"}
              </span>
            </ActionButton>

            <ActionButton
              variant="secondary"
              onClick={() => navigate("/dashboard/navi")}
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-2xl">🏠</span>
                ナビホームに戻る
              </span>
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
