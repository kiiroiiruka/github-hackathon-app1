import { useLocation, useNavigate } from "react-router-dom";
import HeaderComponent from "../../../components/Header/Header";
import ActionButton from "../../../components/RoomCreation/ActionButton";

const Confirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId, roomName, selectedFriends, selectedLocation, selectedDeparture } = location.state || {};
  
  // デバッグ情報
  console.log("Confirmation - 全体のlocation.state:", location.state);
  console.log("Confirmation - selectedFriends:", selectedFriends);
  console.log("Confirmation - selectedFriendsの型:", typeof selectedFriends);
  console.log("Confirmation - selectedFriendsの長さ:", selectedFriends?.length);
  console.log("Confirmation - selectedLocation:", selectedLocation);
  console.log("Confirmation - selectedDeparture:", selectedDeparture);
  
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
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-blue-500 font-medium">ルーム名:</span>
                <span className="text-gray-800 font-semibold">{roomName || "未設定"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-500 font-medium">ルームID:</span>
                <span className="text-gray-600 text-sm font-mono bg-gray-100 px-2 py-1 rounded">{roomId || "不明"}</span>
              </div>
              
              {/* ルート情報 */}
              {(selectedDeparture || selectedLocation) && (
                <div>
                  <span className="text-blue-500 font-medium mb-2 block">設定されたルート:</span>
                  <div className="space-y-3">
                    {selectedDeparture && (
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">�</span>
                          <span className="font-medium text-green-800">出発地</span>
                        </div>
                        <p className="text-green-700 font-medium">{selectedDeparture.name}</p>
                        <p className="text-sm text-green-600">
                          緯度: {selectedDeparture.coordinates[0].toFixed(4)}, 
                          経度: {selectedDeparture.coordinates[1].toFixed(4)}
                        </p>
                      </div>
                    )}
                    
                    {selectedLocation && (
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🎯</span>
                          <span className="font-medium text-blue-800">目的地</span>
                        </div>
                        <p className="text-blue-700 font-medium">{selectedLocation.name}</p>
                        <p className="text-sm text-blue-600">
                          緯度: {selectedLocation.coordinates[0].toFixed(4)}, 
                          経度: {selectedLocation.coordinates[1].toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedFriends && selectedFriends.length > 0 && (
                <div>
                  <span className="text-blue-500 font-medium mb-2 block">招待メンバー ({selectedFriends.length}名):</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedFriends.map((friend, index) => (
                      <div
                        key={friend.uid || index}
                        className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg"
                      >
                        <img
                          src={friend.photoURL || "/default-avatar.png"}
                          alt={friend.displayName}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-blue-800 text-sm font-medium truncate">
                          {friend.displayName || friend.email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="space-y-4">
            {/* ルート確認ボタン */}
            <ActionButton
              onClick={() => navigate("/dashboard/navi/route-screen", {
                state: { 
                  roomId, 
                  roomName,
                  destination: selectedLocation?.coordinates,
                  destinationName: selectedLocation?.name,
                  departure: selectedDeparture?.coordinates,
                  departureName: selectedDeparture?.name,
                  selectedDeparture,
                  selectedLocation,
                  selectedFriends
                }
              })}
              disabled={!selectedLocation}
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-2xl">🗺️</span>
                {selectedLocation ? (
                  <div className="text-center">
                    <div>ルートを確認する</div>
                    {selectedDeparture && (
                      <div className="text-sm opacity-90">出発地→目的地のルートを表示</div>
                    )}
                  </div>
                ) : (
                  "目的地が設定されていません"
                )}
              </span>
            </ActionButton>

            {/* ルーム編集ボタン */}
            <ActionButton
              variant="secondary"
              onClick={() => navigate("/dashboard/navi/room", {
                state: {
                  roomName,
                  selectedFriends,
                  selectedLocation,
                  selectedDeparture
                }
              })}
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-2xl">✏️</span>
                ルーム設定を編集
              </span>
            </ActionButton>

            {/* ホームに戻るボタン */}
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
