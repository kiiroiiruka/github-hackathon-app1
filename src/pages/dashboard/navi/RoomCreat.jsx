import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import HeaderComponent2 from "../../../components/Header/Header2";

const RoomCreat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomName, setRoomName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_selectedFriends");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedLocation, setSelectedLocation] = useState(() => {
    // ローカルストレージから初期値を取得
    const saved = localStorage.getItem("roomCreat_selectedLocation");
    return saved ? JSON.parse(saved) : null;
  });

  // InviterPreferenceから戻ってきた時のフレンド情報を受け取る
  useEffect(() => {
    console.log("RoomCreat - location.state:", location.state);
    if (location.state?.selectedFriends) {
      console.log(
        "RoomCreat - selectedFriends受信:",
        location.state.selectedFriends,
      );
      setSelectedFriends(location.state.selectedFriends);
      // ローカルストレージに保存
      localStorage.setItem(
        "roomCreat_selectedFriends",
        JSON.stringify(location.state.selectedFriends),
      );
    }
    // PurlieuLocationやRouteSelectから選択された場所を受け取る
    if (location.state?.selectedLocation) {
      console.log(
        "RoomCreat - selectedLocation受信:",
        location.state.selectedLocation,
      );
      setSelectedLocation(location.state.selectedLocation);
      // ローカルストレージに保存
      localStorage.setItem(
        "roomCreat_selectedLocation",
        JSON.stringify(location.state.selectedLocation),
      );
    }
  }, [location.state]);

  // selectedFriendsが変更されたときにローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(
      "roomCreat_selectedFriends",
      JSON.stringify(selectedFriends),
    );
  }, [selectedFriends]);

  // selectedLocationが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (selectedLocation) {
      localStorage.setItem(
        "roomCreat_selectedLocation",
        JSON.stringify(selectedLocation),
      );
    } else {
      localStorage.removeItem("roomCreat_selectedLocation");
    }
  }, [selectedLocation]);

  // フレンド選択ページに移動
  const handleInviterNavigation = () => {
    navigate("/dashboard/navi/inviter", {
      state: {
        selectedFriends,
        returnTo: "/dashboard/navi/room",
      },
    });
  };

  // 選択されたフレンドを削除
  const removeFriend = (friendToRemove) => {
    setSelectedFriends((prev) => {
      const updated = prev.filter((friend) => friend.uid !== friendToRemove.uid);
      // ローカルストレージも更新
      localStorage.setItem(
        "roomCreat_selectedFriends",
        JSON.stringify(updated),
      );
      return updated;
    });
  };

  // ルーム作成処理
  const handleCreateRoom = async () => {
    try {
      console.log("ルーム作成時のselectedFriends:", selectedFriends);
      // TODO: ルーム作成機能を実装
      alert("ルーム作成機能は準備中です");

      // 仮の成功処理
      localStorage.removeItem("roomCreat_selectedFriends");
      localStorage.removeItem("roomCreat_selectedLocation");

      navigate("/dashboard/navi/confirmation", {
        state: {
          roomId: "temp-room-id",
          roomName: roomName.trim(),
          selectedFriends,
          selectedLocation,
        },
      });
    } catch (e) {
      console.error("ルーム作成失敗:", e);
      alert("ルームの作成に失敗しました。");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <HeaderComponent2 title="通信" />
      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* タイトルセクション */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🏠 ルーム作成
            </h1>
            <p className="text-gray-600">
              新しいルームを作成して友達と一緒に行動しよう
            </p>
          </div>

          <div className="space-y-6">
            {/* ルーム名セクション */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span>📝</span>
                ルーム名
              </h2>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="ルーム名を入力してください"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* ルート選択セクション */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span>🗺️</span>
                  ルート選択
                </h2>
                {selectedLocation && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    目的地設定済み
                  </span>
                )}
              </div>

              {/* 選択された場所の表示 */}
              {selectedLocation && (
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📍</span>
                    <h3 className="font-semibold text-green-800">
                      設定済み目的地
                    </h3>
                  </div>
                  <p className="text-green-700 font-medium">
                    {selectedLocation.name}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    緯度: {selectedLocation.coordinates[0].toFixed(4)}, 経度:{" "}
                    {selectedLocation.coordinates[1].toFixed(4)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation(null);
                      localStorage.removeItem("roomCreat_selectedLocation");
                    }}
                    className="mt-2 text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    目的地をクリア
                  </button>
                </div>
              )}

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/dashboard/navi/route", {
                      state: {
                        selectedLocation,
                        returnTo: "/dashboard/navi/room",
                      },
                    })
                  }
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  <span className="text-2xl">📍</span>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-800">
                      {selectedLocation ? "目的地を変更" : "ルートを選択"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedLocation
                        ? "別の目的地を設定"
                        : "目的地と経路を設定"}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard/navi/purlieu-location")}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors"
                >
                  <span className="text-2xl">💫</span>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-800">
                      お気に入りから選択
                    </h3>
                    <p className="text-sm text-gray-600">保存済みの場所から選択</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/dashboard/navi/route-screen", {
                      state: {
                        destination: selectedLocation?.coordinates,
                        destinationName: selectedLocation?.name,
                        selectedFriends,
                        roomName: roomName.trim(),
                      },
                    })
                  }
                  disabled={!selectedLocation}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    selectedLocation
                      ? "border-gray-200 hover:bg-green-50 hover:border-green-200"
                      : "border-gray-100 bg-gray-50 cursor-not-allowed"
                  }`}
                >
                  <span className="text-2xl">🧭</span>
                  <div className="text-left">
                    <h3
                      className={`font-medium ${
                        selectedLocation ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      ルート確認
                    </h3>
                    <p
                      className={`text-sm ${
                        selectedLocation ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      地図でルートを確認
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 招待するユーザーセクション */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span>👥</span>
                  招待するユーザー
                </h2>
                {selectedFriends.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {selectedFriends.length}名選択中
                  </span>
                )}
              </div>

              {/* 選択されたフレンドの表示 */}
              {selectedFriends.length > 0 && (
                <div className="mb-4 space-y-2">
                  {selectedFriends.map((friend) => (
                    <div
                      key={friend.uid}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={friend.photoURL || "/default-avatar.png"}
                          alt={friend.displayName}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="font-medium text-gray-800">
                          {friend.displayName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFriend(friend)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleInviterNavigation}
                className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors"
              >
                <span className="text-2xl">✨</span>
                <div className="text-left">
                  <h3 className="font-medium text-gray-800">
                    {selectedFriends.length > 0
                      ? "フレンドを追加/変更"
                      : "フレンドを選択"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedFriends.length > 0
                      ? "選択済みのフレンドを変更できます"
                      : "一緒に行動する友達を招待"}
                  </p>
                </div>
              </button>
            </div>

            {/* 作成ボタン */}
            <div className="pt-4">
              <button
                type="button"
                disabled={!roomName.trim()}
                onClick={handleCreateRoom}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                  roomName.trim()
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <span className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🚀</span>
                  {roomName.trim()
                    ? `「${roomName}」を作成`
                    : "ルーム名を入力してください"}
                </span>
              </button>
            </div>

            {/* 戻るボタン */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard/navi")}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCreat;